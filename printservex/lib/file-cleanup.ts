// SERVER ONLY. Deletes uploaded files we must not keep. Run once a day by app/api/cleanup-files.
// Business rules:
// - Privacy notice: files are deleted 30 days after the order. We wait until the order is
//   closed (completed or cancelled), so staff never lose a file they still have to print.
//   The order record stays; only order_items.storage_path is cleared.
// - Files uploaded for an order that was never placed (the customer left the form) are
//   deleted after a day.
import "server-only";
import { ORDER_FILES_BUCKET, supabaseAdmin } from "@/lib/supabase-admin";

const KEEP_DAYS = 30;
const ABANDONED_HOURS = 24;
const BATCH = 100; // Storage removes at most this many files per call

export type CleanupResult = { orderFiles: number; abandonedFiles: number };

async function removeFiles(paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += BATCH) {
    const { error } = await supabaseAdmin.storage.from(ORDER_FILES_BUCKET).remove(paths.slice(i, i + BATCH));
    if (error) throw new Error(`Removing files failed: ${error.message}`);
  }
}

// 1. Files of closed orders older than 30 days
async function cleanOldOrderFiles(): Promise<number> {
  const before = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("id, storage_path, orders!inner(created_at, status)")
    .not("storage_path", "is", null)
    .lt("orders.created_at", before)
    .in("orders.status", ["completed", "cancelled"])
    .limit(500);
  if (error) throw new Error(`Finding old files failed: ${error.message}`);
  const items = (data ?? []).filter((i) => i.storage_path);
  if (items.length === 0) return 0;

  // Delete the files first, then forget their paths (a retry tomorrow is harmless)
  await removeFiles(items.map((i) => i.storage_path as string));
  const { error: updateError } = await supabaseAdmin
    .from("order_items")
    .update({ storage_path: null })
    .in("id", items.map((i) => i.id));
  if (updateError) throw new Error(`Clearing file paths failed: ${updateError.message}`);
  return items.length;
}

// 2. Upload folders (one per order attempt) that no order uses
async function cleanAbandonedUploads(): Promise<number> {
  const bucket = supabaseAdmin.storage.from(ORDER_FILES_BUCKET);
  const { data: folders, error } = await bucket.list("", { limit: 1000 });
  if (error) throw new Error(`Listing uploads failed: ${error.message}`);

  const tooOld = Date.now() - ABANDONED_HOURS * 3_600_000;
  const stale: string[] = [];
  for (const folder of folders ?? []) {
    if (folder.id !== null) continue; // a loose file, not a folder from prepareUploads
    const { data: files } = await bucket.list(folder.name, { limit: 100 });
    if (!files || files.length === 0) continue;
    // Wait until even the newest file is a day old (the customer may still be submitting)
    const newest = Math.max(...files.map((f) => Date.parse(f.created_at ?? "") || Date.now()));
    if (newest > tooOld) continue;

    const { count } = await supabaseAdmin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .like("storage_path", `${folder.name}/%`);
    if (count === 0) stale.push(...files.map((f) => `${folder.name}/${f.name}`));
  }

  await removeFiles(stale);
  return stale.length;
}

export async function cleanupFiles(): Promise<CleanupResult> {
  const orderFiles = await cleanOldOrderFiles();
  const abandonedFiles = await cleanAbandonedUploads();
  if (orderFiles + abandonedFiles > 0) {
    await supabaseAdmin.from("audit_log").insert({
      actor_label: "System",
      action: "Old files deleted",
      details: `${orderFiles} from orders over ${KEEP_DAYS} days · ${abandonedFiles} never ordered`,
    });
  }
  return { orderFiles, abandonedFiles };
}
