// Runs before every /staff page.
// 1. Keeps the staff sign-in fresh (Supabase sign-ins expire after an hour and get renewed here).
// 2. Not signed in → sends you to /staff/login.
// This is only a quick first check. The real check (an active staff account in the database)
// is getCurrentStaff() in lib/staff-session.ts, and the RLS rules in the database.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && pathname !== "/staff/login") {
    const login = new URL("/staff/login", request.url);
    login.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(login);
    // Keep any cookie changes (e.g. clearing an expired sign-in)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/staff", "/staff/:path*"],
};
