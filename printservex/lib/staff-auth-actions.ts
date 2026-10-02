"use server";

// Server Actions for staff sign-in (S1) and log out. These run ONLY on the server.
// Business rule: 5 wrong passwords in a row lock the account for 15 minutes.

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createStaffClient } from "@/lib/supabase-server";

export type SignInState = { error: string } | null;

// Same answer for an unknown username and a wrong password, so nobody can guess usernames
const WRONG = "Wrong username or password.";

const lockedMessage = (until: string) => {
  const minutes = Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 60_000));
  return `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask the shop owner.`;
};

// Only go back to a staff page after signing in, never to another website
function safeNext(next: FormDataEntryValue | null): string {
  const path = typeof next === "string" ? next : "";
  return path.startsWith("/staff/") && !path.startsWith("/staff/login") && !path.includes("//") ? path : "/staff/dashboard";
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };
  if (username.length > 30 || password.length > 72) return { error: WRONG };

  // The service role reads the profile because nobody is signed in yet
  const { data: profile, error: findError } = await supabaseAdmin
    .from("staff_profiles")
    .select("id, full_name, is_active, locked_until, must_change_password")
    .eq("username", username)
    .maybeSingle();
  if (findError) {
    console.error("signIn lookup:", findError.message);
    return { error: "We couldn't sign you in right now. Please try again." };
  }
  if (!profile) return { error: WRONG };
  // Checked BEFORE the password, so a locked account can't keep being guessed
  if (profile.locked_until && Date.parse(profile.locked_until) > Date.now()) {
    return { error: lockedMessage(profile.locked_until) };
  }

  // Supabase Auth signs in with an email, so find the email behind this username
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  const email = authUser.user?.email;
  if (!email) return { error: WRONG };

  const supabase = await createStaffClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  // Deactivated accounts are also blocked in Supabase Auth (see setStaffActive)
  if (authError?.code === "user_banned") return { error: "This account is turned off. Ask the shop owner." };
  if (authError) {
    const { data: lockedUntil } = await supabaseAdmin.rpc("record_failed_login", { p_id: profile.id });
    return { error: lockedUntil ? lockedMessage(lockedUntil) : WRONG };
  }

  // Right password, but the owner turned this account off
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is turned off. Ask the shop owner." };
  }

  await supabaseAdmin.rpc("record_login_success", { p_id: profile.id });
  await supabaseAdmin.from("audit_log").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "Signed in" });

  // Business rule: a temporary password must be changed first
  redirect(profile.must_change_password ? "/staff/profile" : safeNext(form.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createStaffClient();
  await supabase.auth.signOut();
  redirect("/staff/login");
}
