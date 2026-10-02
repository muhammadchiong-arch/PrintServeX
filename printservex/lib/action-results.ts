// SERVER ONLY. Shared by the Server Action files (lib/staff-actions.ts, lib/admin-actions.ts).
import "server-only";
import { getCurrentStaff } from "@/lib/staff-session";
import { createStaffClient } from "@/lib/supabase-server";

export type Fail = { ok: false; error: string };
export type ActionResult = { ok: true } | Fail;

export const SIGNED_OUT: Fail = { ok: false, error: "You were signed out. Sign in again, then retry." };
export const NOT_ADMIN: Fail = { ok: false, error: "Only the shop owner (admin) can do this." };
export const FAILED: Fail = { ok: false, error: "That didn't save. Check your connection and try again." };

// Messages we raise ourselves in the database functions are safe to show.
// Anything else (a bug, a network problem) gets a general message and goes to the server log.
export function fromDb(error: { code?: string; message: string } | null, where: string): ActionResult {
  if (!error) return { ok: true };
  if (error.code === "P0001" || error.code === "42501") return { ok: false, error: error.message };
  console.error(`${where}:`, error.message);
  return FAILED;
}

// Runs a database function AS the signed-in staff member (the function checks their role)
export async function staffRpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  if (!(await getCurrentStaff())) return SIGNED_OUT;
  const supabase = await createStaffClient();
  const { error } = await supabase.rpc(fn, args);
  return fromDb(error, fn);
}
