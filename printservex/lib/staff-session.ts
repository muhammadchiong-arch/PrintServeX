// SERVER ONLY. "Who is signed in?" for every staff page and staff Server Action.
// Signed in is not enough: the person also needs an ACTIVE row in staff_profiles,
// so a deactivated account loses access on the next page load.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { StaffUser } from "@/lib/staff-types";
import { createStaffClient } from "@/lib/supabase-server";

// cache(): several calls during one page load ask the database only once
export const getCurrentStaff = cache(async (): Promise<StaffUser | null> => {
  const supabase = await createStaffClient();
  const { data: auth } = await supabase.auth.getClaims();
  const id = auth?.claims?.sub;
  if (!id) return null;

  // RLS "read own profile" lets each person read only their own row
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id, full_name, username, role, is_active, last_sign_in_at, must_change_password")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("staff_profiles:", error.message);
  if (!data?.is_active) return null;

  return {
    id: data.id,
    name: data.full_name,
    username: data.username,
    role: data.role === "admin" ? "Admin" : "Staff",
    active: true,
    lastSignIn: data.last_sign_in_at,
    mustChangePassword: data.must_change_password,
  };
});

// For pages: not signed in (or deactivated) → back to the sign-in page
export async function requireStaff(): Promise<StaffUser> {
  const me = await getCurrentStaff();
  if (!me) redirect("/staff/login");
  return me;
}
