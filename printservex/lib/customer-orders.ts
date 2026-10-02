// Placing an order from the browser: customers (C2) and staff walk-ins (S5).
// submitOrder() uploads the files to Supabase Storage and asks the SERVER to save the order;
// the server calculates the price and the reference number.
// The saved order is also kept in this browser tab (sessionStorage) so the confirmation page
// can show it right away. Tracking (/track) reads the order from the database on the server.

import type { Catalog, OrderLine } from "@/components/order/types";
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
 * 1. the server checks the files and returns one-time upload links (skipped if no line has a file),
 * 2. the browser uploads each file straight to Storage,
 * 3. the server checks everything again, calculates the price and saves the order.
 */
export async function submitOrder(details: CustomerDetails, lines: OrderLine[], catalog: Catalog, opts: { walkIn?: boolean } = {}): Promise<SubmitResult> {
  try {
    const withFiles = lines.filter((l): l is OrderLine & { file: File } => l.file !== null);
    const paths = new Map<string, string>(); // line id → where its file was uploaded
    let batch = "";
    if (withFiles.length > 0) {
      const prepared = await prepareUploads(withFiles.map((l) => ({ name: l.file.name, size: l.file.size })));
      if (!prepared.ok) return prepared;
      batch = prepared.batch;

      for (const [i, l] of withFiles.entries()) {
        const ticket = prepared.uploads[i];
        if (!ticket) return { ok: false, error: "Upload failed. Please try again." };
        const { error } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(ticket.path, ticket.token, l.file, { contentType: contentTypeFor(l.file.name) });
        if (error) return { ok: false, error: `${l.file.name} couldn't be uploaded. Check your connection and try again.` };
        paths.set(l.id, ticket.path);
      }
    }

    // No prices are sent: the server works them out from the database
    const result = await placeOrder({
      customer: details,
      batch,
      items: lines.map((l) => {
        const isDocument = catalog.services.find((s) => s.id === l.serviceId)?.kind === "document";
        return {
          serviceId: l.serviceId,
          path: paths.get(l.id) ?? null,
          fileName: l.file?.name ?? null,
          options: isDocument ? l.options : null,
          details: l.details,
        };
      }),
      walkIn: opts.walkIn === true,
    });
    if (!result.ok || opts.walkIn) return result;

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

