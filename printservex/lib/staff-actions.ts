"use server";

// Server Actions for the staff portal. These run ONLY on the server.
// Each one checks who is signed in first. Order and stock changes run AS that person
// (RLS + the staff_* database functions in supabase/006_staff_work.sql check them again).
// Account changes need the service role (Supabase Auth admin), so they check for an admin here.

import { createClient } from "@supabase/supabase-js";
import { FAILED, fromDb, NOT_ADMIN, SIGNED_OUT, staffRpc as rpc, type ActionResult, type Fail } from "@/lib/action-results";
import type { PaymentMethod } from "@/lib/orders";
import { isLaminationSize } from "@/lib/price";
import type { InventoryLink, Role } from "@/lib/staff-types";
import { getCurrentStaff } from "@/lib/staff-session";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";
import { ORDER_FILES_BUCKET, supabaseAdmin } from "@/lib/supabase-admin";
import { createStaffClient } from "@/lib/supabase-server";
import { makeTempPassword } from "@/lib/temp-password";

export type { ActionResult } from "@/lib/action-results";

const isRef = (v: unknown): v is string => typeof v === "string" && /^PSX-\d{8}-\d{4}$/.test(v);

// ---------- Orders (S3/S4) ----------

export async function setOrderStatus(ref: string, status: "processing" | "ready"): Promise<ActionResult> {
  if (!isRef(ref) || (status !== "processing" && status !== "ready")) return FAILED;
  return rpc("staff_set_status", { p_ref: ref, p_status: status });
}

export async function cancelOrder(ref: string, reason: string): Promise<ActionResult> {
  if (!isRef(ref) || typeof reason !== "string") return FAILED;
  return rpc("staff_cancel_order", { p_ref: ref, p_reason: reason.slice(0, 300) });
}

export async function completeOrder(ref: string, method: PaymentMethod): Promise<ActionResult> {
  if (!isRef(ref) || (method !== "cash" && method !== "gcash")) return FAILED;
  return rpc("staff_complete_order", { p_ref: ref, p_method: method });
}

export async function setFinalPrice(ref: string, amount: number, note: string): Promise<ActionResult> {
  if (!isRef(ref) || !Number.isFinite(amount) || typeof note !== "string") return FAILED;
  return rpc("staff_set_final_price", { p_ref: ref, p_amount: amount, p_note: note.slice(0, 200) });
}

export async function setRemarks(ref: string, remarks: string): Promise<ActionResult> {
  if (!isRef(ref) || typeof remarks !== "string") return FAILED;
  return rpc("staff_set_remarks", { p_ref: ref, p_remarks: remarks });
}

// A link to one uploaded file, valid for 5 minutes. "view" opens it in the browser (PDF, JPG, PNG),
// "download" saves it with its original name. Made AS the staff member, so the storage rule
// "staff read order files" must allow it. The file path comes from the order, never from the browser.
export async function getFileLink(ref: string, position: number, mode: "view" | "download" = "download"): Promise<{ ok: true; url: string } | Fail> {
  if (!isRef(ref) || !Number.isInteger(position) || position < 1 || (mode !== "view" && mode !== "download")) return FAILED;
  if (!(await getCurrentStaff())) return SIGNED_OUT;
  const supabase = await createStaffClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("file_name, storage_path, orders!inner(ref)")
    .eq("orders.ref", ref)
    .eq("position", position)
    .maybeSingle();
  // Business rule (privacy notice): files of closed orders are deleted 30 days after the order was placed (lib/file-cleanup.ts)
  if (item && !item.storage_path) return { ok: false, error: "This file was deleted. Files are kept for 30 days." };
  if (!item?.storage_path) return { ok: false, error: "This file isn't in storage." };

  const { data, error } = await supabase.storage
    .from(ORDER_FILES_BUCKET)
    .createSignedUrl(item.storage_path, 300, mode === "download" ? { download: item.file_name } : undefined);
  if (error || !data) {
    console.error("getFileLink:", error?.message);
    return { ok: false, error: "The file couldn't be opened. Try again." };
  }
  return { ok: true, url: data.signedUrl };
}

// ---------- Inventory (S7/S8) ----------

export async function moveStock(itemId: string, type: "in" | "out", qty: number, note: string): Promise<ActionResult> {
  if (!/^\d+$/.test(itemId) || (type !== "in" && type !== "out") || !Number.isInteger(qty) || typeof note !== "string") return FAILED;
  return rpc("staff_move_stock", { p_item_id: Number(itemId), p_type: type, p_qty: qty, p_note: note.slice(0, 300) });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The link as database parameters, or null if it isn't valid
function linkParams(link: unknown): { p_paper_size_id: string | null; p_paper_type_id: string | null; p_lamination_size: string | null } | null {
  if (link === null) return { p_paper_size_id: null, p_paper_type_id: null, p_lamination_size: null };
  const l = link as InventoryLink;
  if (l?.kind === "paper" && UUID.test(String(l.sizeId)) && UUID.test(String(l.typeId)))
    return { p_paper_size_id: l.sizeId, p_paper_type_id: l.typeId, p_lamination_size: null };
  if (l?.kind === "lamination" && isLaminationSize(l.size)) return { p_paper_size_id: null, p_paper_type_id: null, p_lamination_size: l.size };
  return null;
}

type ItemInput = { name: string; unit: string; reorderLevel: number; link: InventoryLink | null };
const validItem = (i: ItemInput) =>
  typeof i?.name === "string" && typeof i.unit === "string" && Number.isInteger(i.reorderLevel) && linkParams(i.link) !== null;

export async function addItem(item: ItemInput & { qty: number }): Promise<ActionResult> {
  if (!validItem(item) || !Number.isInteger(item.qty)) return FAILED;
  return rpc("staff_add_item", {
    p_name: item.name.slice(0, 100),
    p_unit: item.unit.slice(0, 30),
    p_qty: item.qty,
    p_reorder: item.reorderLevel,
    // Only sent when there is a link, so adding a plain item still works before 011 is run
    ...(item.link ? linkParams(item.link) : {}),
  });
}

// Name, unit, reorder level and what it is used for. The quantity only changes with Stock in / out.
export async function updateItem(itemId: string, item: ItemInput): Promise<ActionResult> {
  if (!/^\d+$/.test(itemId) || !validItem(item)) return FAILED;
  return rpc("staff_update_item", {
    p_id: Number(itemId),
    p_name: item.name.slice(0, 100),
    p_unit: item.unit.slice(0, 30),
    p_reorder: item.reorderLevel,
    ...linkParams(item.link),
  });
}

// Admin only (checked here and by admin_delete_item in the database)
export async function deleteItem(itemId: string): Promise<ActionResult> {
  if (!/^\d+$/.test(itemId)) return FAILED;
  const me = await getCurrentStaff();
  if (!me) return SIGNED_OUT;
  if (me.role !== "Admin") return NOT_ADMIN;
  return rpc("admin_delete_item", { p_id: Number(itemId) });
}

// ---------- Audit log ----------

// Only for things that happen in the browser (a backup file is made there)
export async function logBackup(details: string): Promise<ActionResult> {
  const me = await getCurrentStaff();
  if (!me) return SIGNED_OUT;
  if (me.role !== "Admin") return NOT_ADMIN; // backups are on the admin Settings page
  const supabase = await createStaffClient();
  const { error } = await supabase
    .from("audit_log")
    .insert({ actor_id: me.id, actor_label: me.name, action: "Backup created", details: String(details).slice(0, 100) });
  return fromDb(error, "logBackup");
}

async function audit(actor: { id: string; name: string }, action: string, details: string) {
  const { error } = await supabaseAdmin.from("audit_log").insert({ actor_id: actor.id, actor_label: actor.name, action, details });
  if (error) console.error("audit:", error.message);
}

// ---------- Staff accounts (S11, admin only) ----------

// Business rule: usernames are small letters, numbers, dots and underscores (3–30)
const USERNAME = /^[a-z0-9._]{3,30}$/;

// Supabase Auth needs an email, but staff sign in with a username. Each account gets an
// address that can never receive mail (".invalid" is reserved for this), and no email is sent.
const loginEmail = (username: string) => `${username}@staff.printservex.invalid`;

export async function addStaff(input: { name: string; username: string; role: Role }): Promise<{ ok: true; password: string } | Fail> {
  const me = await getCurrentStaff();
  if (!me) return SIGNED_OUT;
  if (me.role !== "Admin") return NOT_ADMIN;

  const name = String(input?.name ?? "").trim().replace(/\s+/g, " ");
  const username = String(input?.username ?? "").trim().toLowerCase();
  const role = input?.role === "Admin" ? "admin" : "staff";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter the full name." };
  if (!USERNAME.test(username)) return { ok: false, error: "Use 3 to 30 small letters, numbers or dots for the username." };

  const { data: taken } = await supabaseAdmin.from("staff_profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { ok: false, error: "This username is taken." };

  const password = makeTempPassword();
  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: loginEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (authError || !created.user) {
    console.error("addStaff createUser:", authError?.message);
    return { ok: false, error: authError?.message.includes("already") ? "This username is taken." : FAILED.error };
  }

  const { error: profileError } = await supabaseAdmin.from("staff_profiles").insert({
    id: created.user.id,
    full_name: name,
    username,
    role,
    must_change_password: true,
  });
  if (profileError) {
    // Don't leave a login without an account
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    console.error("addStaff profile:", profileError.message);
    return FAILED;
  }

  await audit(me, "Staff added", `${name} · ${role === "admin" ? "Admin" : "Staff"}`);
  return { ok: true, password };
}

type Found = { error: Fail } | { me: { id: string; name: string }; user: { id: string; full_name: string } };

async function otherAccount(id: string): Promise<Found> {
  const me = await getCurrentStaff();
  if (!me) return { error: SIGNED_OUT };
  if (me.role !== "Admin") return { error: NOT_ADMIN };
  // Business rule: your own account is changed on the Profile page, not here
  if (typeof id !== "string" || id === me.id) return { error: FAILED };
  const { data: user } = await supabaseAdmin.from("staff_profiles").select("id, full_name").eq("id", id).maybeSingle();
  if (!user) return { error: FAILED };
  return { me, user };
}

export async function resetStaffPassword(id: string): Promise<{ ok: true; password: string } | Fail> {
  const found = await otherAccount(id);
  if ("error" in found) return found.error;

  const password = makeTempPassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) {
    console.error("resetStaffPassword:", error.message);
    return FAILED;
  }
  await supabaseAdmin.from("staff_profiles").update({ must_change_password: true, failed_logins: 0, locked_until: null }).eq("id", id);
  await audit(found.me, "Password reset", found.user.full_name);
  return { ok: true, password };
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const found = await otherAccount(id);
  if ("error" in found) return found.error;

  const { error } = await supabaseAdmin.from("staff_profiles").update({ is_active: Boolean(active) }).eq("id", id);
  if (error) return fromDb(error, "setStaffActive");
  // A ban also stops sign-ins that are still open on another device from being renewed
  await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  await audit(found.me, active ? "Staff reactivated" : "Staff deactivated", found.user.full_name);
  return { ok: true };
}

// ---------- Your own password (S13) ----------

// Business rule: passwords need at least 10 characters and a number
export async function changeMyPassword(current: string, next: string): Promise<ActionResult> {
  const me = await getCurrentStaff();
  if (!me) return SIGNED_OUT;
  if (typeof current !== "string" || typeof next !== "string") return FAILED;
  if (next.length < 10 || next.length > 72 || !/\d/.test(next)) return { ok: false, error: "Use at least 10 characters, with a number." };
  if (next === current) return { ok: false, error: "Choose a password different from the current one." };

  // Check the current password with a separate client, so the real sign-in isn't touched
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(me.id);
  const email = authUser.user?.email;
  if (!email) return FAILED;
  const checker = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await checker.auth.signInWithPassword({ email, password: current });
  if (wrong) return { ok: false, error: "Your current password is wrong." };
  await checker.auth.signOut({ scope: "local" }); // "local": only this check, not the real sign-in

  const supabase = await createStaffClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("changeMyPassword:", error.message);
    return { ok: false, error: error.message.includes("weak") ? "Choose a stronger password." : FAILED.error };
  }
  await supabaseAdmin.from("staff_profiles").update({ must_change_password: false }).eq("id", me.id);
  await audit(me, "Password changed", me.name);
  return { ok: true };
}
