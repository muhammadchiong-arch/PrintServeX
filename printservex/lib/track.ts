// SERVER ONLY: looks up one order for the tracking page (C4/C5).
import "server-only";
import { normalizePhone } from "@/lib/order-details";
import { ORDER_SELECT, rowToOrder, type OrderRow } from "@/lib/order-rows";
import { REF_PATTERN, type Order } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type TrackResult = { ok: true; order: Order } | { ok: false; error: "format" | "not_found" | "unavailable" | "too_many" };

// Business rule: after 10 wrong tries for one reference number in an hour, tracking it is paused,
// so nobody can guess the 4 digits (there are only 10,000). Right answers are never counted.
const MAX_WRONG_TRIES = 10;
const TRY_WINDOW_MS = 60 * 60 * 1000;

// Records this try FIRST, then counts the tries of the last hour (this one included). Tries sent at
// the same time all see each other, so sending many at once doesn't get past the limit.
// Returns the id of this try (removed again if the answer is right), or null if the table isn't
// there yet (011 not run): then there is no limit.
async function recordTry(ref: string): Promise<{ id: number; count: number } | null> {
  const { data, error } = await supabaseAdmin.from("track_attempts").insert({ ref }).select("id").single();
  if (error || !data) {
    console.error("track_attempts (run supabase/011_inventory_links.sql?)", error?.message);
    return null;
  }
  const since = new Date(Date.now() - TRY_WINDOW_MS).toISOString();
  const { count } = await supabaseAdmin.from("track_attempts").select("id", { count: "exact", head: true }).eq("ref", ref).gte("at", since);
  return { id: data.id as number, count: count ?? 0 };
}

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
  const attempt = await recordTry(ref);
  if (attempt && attempt.count > MAX_WRONG_TRIES) return { ok: false, error: "too_many" };

  const { data, error } = await supabaseAdmin.from("orders").select(ORDER_SELECT).eq("ref", ref).maybeSingle();
  if (error) {
    console.error("trackOrder failed", error);
    if (attempt) await supabaseAdmin.from("track_attempts").delete().eq("id", attempt.id); // our fault, not a wrong try
    return { ok: false, error: "unavailable" };
  }
  const row = data as OrderRow | null;
  if (!row || !normalizePhone(row.customer_phone).endsWith(last4)) return { ok: false, error: "not_found" }; // the try stays counted
  // Right answer: it doesn't count as a wrong try
  if (attempt) await supabaseAdmin.from("track_attempts").delete().eq("id", attempt.id);

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
