// SERVER ONLY. Supabase client that acts AS the signed-in staff member, so the RLS rules
// (is_staff, is_admin) decide what it can read and change. The sign-in is kept in cookies.
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";

export async function createStaffClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Pages can't set cookies, only Server Actions can. That's fine:
          // proxy.ts already refreshes the sign-in on every staff page.
        }
      },
    },
  });
}
