// Customer-side order storage FOR NOW: orders a customer submits are kept in this browser
// (sessionStorage) so the confirmation and tracking pages work before Supabase saving is added.
// Later, submitOrder() will insert into Supabase on the server and findOrder() will query it.

import { normalizePhone } from "@/lib/order-details";
import { makeRef, REF_PATTERN, type Order } from "@/lib/orders";
import { SAMPLE_ORDERS } from "@/lib/sample/orders";
import type { OrderDraft } from "@/components/order/build-order";

const KEY = "psx-orders";

function readSaved(): Order[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return []; // storage blocked (private mode) or broken data
  }
}

// Creates the order with a new reference number and status Pending
export function submitOrder(draft: OrderDraft): Order {
  const now = new Date();
  // Placeholder number: the real one will be the next number for the day, given by the database
  const ref = makeRef(now, 1000 + Math.floor(Math.random() * 9000));
  const order: Order = {
    ...draft,
    ref,
    source: "online",
    status: "pending",
    createdAt: now.toISOString(),
    history: [{ status: "pending", at: now.toISOString(), by: "Online order" }],
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...readSaved(), order]));
  } catch {
    // If the browser blocks storage, the confirmation page still shows the number
  }
  return order;
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
