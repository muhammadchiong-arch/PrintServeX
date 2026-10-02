// SERVER ONLY. Loads everything the staff portal shows, AS the signed-in staff member,
// so the RLS rules decide what comes back (e.g. only an admin gets every staff account).
import "server-only";
import { ORDER_SELECT, rowToOrder, type OrderRow } from "@/lib/order-rows";
import type { Order } from "@/lib/orders";
import type { ActivityEntry, InventoryItem, StaffUser } from "@/lib/staff-types";
import { createStaffClient } from "@/lib/supabase-server";

export type StaffData = {
  orders: Order[]; // newest first
  inventory: InventoryItem[];
  users: StaffUser[];
  activity: ActivityEntry[]; // newest first (also the audit log)
};

// Enough for a small shop. Older orders stay in the database; Reports only counts what is loaded.
const MAX_ORDERS = 2000;
const MAX_ACTIVITY = 300;
const MAX_MOVES_PER_ITEM = 50;

type ProfileRow = {
  id: string;
  full_name: string;
  username: string;
  role: "admin" | "staff";
  is_active: boolean;
  last_sign_in_at: string | null;
  must_change_password: boolean;
};

export function profileToUser(p: ProfileRow): StaffUser {
  return {
    id: p.id,
    name: p.full_name,
    username: p.username,
    role: p.role === "admin" ? "Admin" : "Staff",
    active: p.is_active,
    lastSignIn: p.last_sign_in_at,
    mustChangePassword: p.must_change_password,
  };
}

export async function loadStaffData(): Promise<StaffData | null> {
  const supabase = await createStaffClient();
  const [orders, items, users, activity] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(MAX_ORDERS),
    supabase
      .from("inventory_items")
      .select("id, name, unit, qty, reorder_level, inventory_moves(type, change, balance, note, actor_label, at)")
      .order("name")
      .order("at", { referencedTable: "inventory_moves", ascending: false })
      .limit(MAX_MOVES_PER_ITEM, { referencedTable: "inventory_moves" }),
    supabase
      .from("staff_profiles")
      .select("id, full_name, username, role, is_active, last_sign_in_at, must_change_password")
      .order("full_name"),
    supabase.from("audit_log").select("at, actor_label, action, details").order("at", { ascending: false }).limit(MAX_ACTIVITY),
  ]);

  const failed = [orders, items, users, activity].find((r) => r.error);
  if (failed?.error) {
    console.error("loadStaffData:", failed.error.message);
    return null;
  }

  return {
    orders: (orders.data as unknown as OrderRow[]).map(rowToOrder),
    inventory: (items.data ?? []).map((i) => ({
      id: String(i.id),
      name: i.name,
      unit: i.unit,
      qty: i.qty,
      reorderLevel: i.reorder_level,
      moves: i.inventory_moves.map((m) => ({
        at: m.at,
        type: m.type,
        change: m.change,
        balance: m.balance,
        note: m.note,
        by: m.actor_label,
      })),
    })),
    users: (users.data as ProfileRow[]).map(profileToUser),
    activity: (activity.data ?? []).map((a) => ({ at: a.at, who: a.actor_label, action: a.action, details: a.details })),
  };
}
