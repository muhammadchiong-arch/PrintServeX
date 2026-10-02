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

export const supabase = createClient(url, key);
