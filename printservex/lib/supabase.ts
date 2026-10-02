// Supabase client used by the server pages (price list, order form).
// Keys come from .env.local (never commit it) and from Vercel's Environment Variables.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase has used different names for this key over time, so accept any of them
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Says exactly which value is missing (never prints the key itself)
  const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean).join(" and ");
  throw new Error(
    `Missing ${missing}. Put .env.local next to package.json, then stop and restart "npm run dev". On Vercel, add it in Settings → Environment Variables.`,
  );
}

// Also used by the signed-in staff client (lib/supabase-server.ts) and proxy.ts
export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

export const supabase = createClient(url, key);
