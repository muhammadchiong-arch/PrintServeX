// SERVER ONLY: looks up one order for the tracking page (C4/C5).
import "server-only";
import { normalizePhone } from "@/lib/order-details";
import { ORDER_SELECT, rowToOrder, type OrderRow } from "@/lib/order-rows";
import { REF_PATTERN, type Order } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type TrackResult = { ok: true; order: Order } | { ok: false; error: "format" | "not_found" | "unavailable" };

/**
 * Business rule: a customer sees an order only if BOTH the reference number AND the
 * last 4 digits of the contact number match. No login needed.
 * - A wrong number and a missing order give the SAME answer ("not_found"), so nobody can
 *   find out which reference numbers exist.
 * - Only what the status page needs is sent back: no phone, email or staff remarks.
 */
export async function trackOrder(refInput: string, codeInput: string): Promise<TrackResult> {
  const ref = refInput.trim().toUpperCase();
  const last4 = codeInput.replace(/\D/g, "");
  if (!REF_PATTERN.test(ref) || last4.length !== 4) return { ok: false, error: "format" };

  const { data, error } = await supabaseAdmin.from("orders").select(ORDER_SELECT).eq("ref", ref).maybeSingle();
  if (error) {
    console.error("trackOrder failed", error);
    return { ok: false, error: "unavailable" };
  }
  const row = data as OrderRow | null;
  if (!row || !normalizePhone(row.customer_phone).endsWith(last4)) return { ok: false, error: "not_found" };

  const order = rowToOrder(row);
  return {
    ok: true,
    order: {
      ...order,
      customer: { name: order.customer.name, phone: `•••• ${last4}` },
      remarks: undefined,
      history: order.history.map((h) => ({ ...h, by: "" })), // staff names stay private
      payment: order.payment && { ...order.payment, by: "" },
    },
  };
}
