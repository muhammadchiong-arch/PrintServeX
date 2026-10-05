// SERVER ONLY. Loads everything the staff portal shows, AS the signed-in staff member,
// so the RLS rules decide what comes back (e.g. only an admin gets every staff account).
import "server-only";
import { ORDER_SELECT, rowToOrder, type OrderRow } from "@/lib/order-rows";
import type { Order } from "@/lib/orders";
import { isLaminationSize, photoSizeText } from "@/lib/price";
import type { ActivityEntry, InventoryItem, InventoryLink, StaffUser } from "@/lib/staff-types";
import { createStaffClient } from "@/lib/supabase-server";

export type StaffData = {
  orders: Order[]; // newest first
  inventory: InventoryItem[];
  users: StaffUser[];
  activity: ActivityEntry[]; // newest first (also the audit log)
  // Paper sizes and types (active ones), for linking inventory items to a paper
  paper: { sizes: { id: string; name: string }[]; types: { id: string; name: string }[]; photoSizes: { key: string; name: string }[] };
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

type ItemRow = {
  id: number;
  name: string;
  unit: string;
  qty: number;
  reorder_level: number;
  paper_size_id?: string | null; // these 3 come from supabase/011_inventory_links.sql
  paper_type_id?: string | null;
  lamination_size?: string | null;
  photo_size?: string | null; // from supabase/013_photo_print_sizes.sql
  inventory_moves: { type: "in" | "out" | "adjust"; change: number; balance: number; note: string; actor_label: string; at: string }[];
};

const MOVES = "inventory_moves(type, change, balance, note, actor_label, at)";

function linkOf(i: ItemRow): InventoryLink | null {
  if (i.paper_size_id && i.paper_type_id) return { kind: "paper", sizeId: i.paper_size_id, typeId: i.paper_type_id };
  if (isLaminationSize(i.lamination_size)) return { kind: "lamination", size: i.lamination_size };
  if (i.photo_size) return { kind: "photo", size: i.photo_size };
  return null;
}

// Inventory with its links. Columns added by 011 / 013 may not exist yet: then load without them.
async function loadInventory(supabase: Awaited<ReturnType<typeof createStaffClient>>) {
  const query = (columns: string) =>
    supabase
      .from("inventory_items")
      .select(`${columns}, ${MOVES}`)
      .order("name")
      .order("at", { referencedTable: "inventory_moves", ascending: false })
      .limit(MAX_MOVES_PER_ITEM, { referencedTable: "inventory_moves" });
  const withPhoto = await query("id, name, unit, qty, reorder_level, paper_size_id, paper_type_id, lamination_size, photo_size");
  if (!withPhoto.error) return withPhoto;
  const linked = await query("id, name, unit, qty, reorder_level, paper_size_id, paper_type_id, lamination_size");
  if (!linked.error) return linked;
  console.error("Inventory links not loaded (run supabase/011_inventory_links.sql?)", linked.error.message);
  return query("id, name, unit, qty, reorder_level");
}

export async function loadStaffData(): Promise<StaffData | null> {
  const supabase = await createStaffClient();
  const [orders, items, users, activity, sizes, types, photoSizes] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(MAX_ORDERS),
    loadInventory(supabase),
    supabase
      .from("staff_profiles")
      .select("id, full_name, username, role, is_active, last_sign_in_at, must_change_password")
      .order("full_name"),
    supabase.from("audit_log").select("at, actor_label, action, details").order("at", { ascending: false }).limit(MAX_ACTIVITY),
    supabase.from("paper_sizes").select("id, name").eq("is_active", true).order("created_at"),
    supabase.from("paper_types").select("id, name").eq("is_active", true).order("created_at"),
    supabase.from("photo_print_sizes").select("key, label, width_in, height_in").order("sort"), // missing before 013: empty
  ]);

  const failed = [orders, items, users, activity].find((r) => r.error);
  if (failed?.error) {
    console.error("loadStaffData:", failed.error.message);
    return null;
  }

  return {
    orders: (orders.data as unknown as OrderRow[]).map(rowToOrder),
    inventory: ((items.data ?? []) as unknown as ItemRow[]).map((i) => ({
      id: String(i.id),
      name: i.name,
      unit: i.unit,
      qty: i.qty,
      reorderLevel: i.reorder_level,
      link: linkOf(i),
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
    // Not critical: without them, items just can't be linked to a paper
    paper: {
      sizes: ((sizes.data ?? []) as { id: string; name: string }[]).map((s) => ({ id: String(s.id), name: s.name })),
      types: ((types.data ?? []) as { id: string; name: string }[]).map((t) => ({ id: String(t.id), name: t.name })),
      // e.g. { key: "4r", name: "4R (4 × 6 in)" }
      photoSizes: ((photoSizes.data ?? []) as { key: string; label: string; width_in: number; height_in: number }[]).map((p) => ({
        key: p.key,
        name: photoSizeText({ label: p.label, widthIn: Number(p.width_in), heightIn: Number(p.height_in) }),
      })),
    },
  };
}
