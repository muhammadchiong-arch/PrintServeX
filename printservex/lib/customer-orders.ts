// Customer side of placing an order (runs in the browser).
// submitOrder() uploads the files to Supabase Storage and asks the SERVER to save the order;
// the server calculates the price and the reference number.
// The saved order is also kept in this browser tab (sessionStorage) so the confirmation page
// can show it right away. Tracking (/track) reads the order from the database on the server.

import type { OrderFile } from "@/components/order/types";
import { contentTypeFor } from "@/lib/files";
import { prepareUploads, placeOrder } from "@/lib/order-actions";
import type { CustomerDetails } from "@/lib/order-details";
import type { Order } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

const KEY = "psx-orders";
const BUCKET = "order-files";

function readSaved(): Order[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return []; // storage blocked (private mode) or broken data
  }
}

export type SubmitResult = { ok: true; order: Order } | { ok: false; error: string };

/**
 * Sends the order in 3 steps:
 * 1. the server checks the files and returns one-time upload links,
 * 2. the browser uploads each file straight to Storage,
 * 3. the server checks everything again, calculates the price and saves the order.
 */
export async function submitOrder(details: CustomerDetails, files: OrderFile[]): Promise<SubmitResult> {
  try {
    const prepared = await prepareUploads(files.map((f) => ({ name: f.file.name, size: f.file.size })));
    if (!prepared.ok) return prepared;

    for (const [i, f] of files.entries()) {
      const ticket = prepared.uploads[i];
      if (!ticket) return { ok: false, error: "Upload failed. Please try again." };
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, f.file, { contentType: contentTypeFor(f.file.name) });
      if (error) return { ok: false, error: `${f.file.name} couldn't be uploaded. Check your connection and try again.` };
    }

    // No prices are sent: the server works them out from the database
    const result = await placeOrder({
      customer: details,
      batch: prepared.batch,
      items: files.map((f, i) => ({ ...f.options, path: prepared.uploads[i]?.path ?? "", fileName: f.file.name })),
    });
    if (!result.ok) return result;

    try {
      sessionStorage.setItem(KEY, JSON.stringify([...readSaved(), result.order]));
    } catch {
      // If the browser blocks storage, the confirmation page still shows the number
    }
    return result;
  } catch {
    return { ok: false, error: "We couldn't reach the shop. Check your connection and try again." };
  }
}

export function getSavedOrder(ref: string): Order | undefined {
  return readSaved().find((o) => o.ref === ref);
}

