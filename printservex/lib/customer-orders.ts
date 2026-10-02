// Customer side of placing an order (runs in the browser).
// submitOrder() uploads the files to Supabase Storage and asks the SERVER to save the order;
// the server calculates the price and the reference number.
// The saved order is also kept in this browser tab (sessionStorage) so the confirmation page
// can show it. Tracking (findOrder) still uses this tab + sample data until step 5.

import type { OrderFile } from "@/components/order/types";
import { contentTypeFor } from "@/lib/files";
import { prepareUploads, placeOrder } from "@/lib/order-actions";
import { normalizePhone, type CustomerDetails } from "@/lib/order-details";
import { REF_PATTERN, type Order } from "@/lib/orders";
import { SAMPLE_ORDERS } from "@/lib/sample/orders";
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

export type LookupResult = { ok: true; order: Order } | { ok: false; error: "format" | "not_found" };

/**
 * Business rule: a customer sees an order only if BOTH the reference number
 * and the last 4 digits of the contact number match (no login needed).
 */
export function findOrder(refInput: string, last4Input: string): LookupResult {
  const ref = refInput.trim().toUpperCase();
  const last4 = last4Input.replace(/\D/g, "");
  if (!REF_PATTERN.test(ref) || last4.length !== 4) return { ok: false, error: "format" };

  const order = [...readSaved(), ...SAMPLE_ORDERS].find((o) => o.ref === ref);
  if (!order || !normalizePhone(order.customer.phone).endsWith(last4)) return { ok: false, error: "not_found" };
  return { ok: true, order };
}
