// Supabase client used by the server pages (price list, order form).
// If your own lib/supabase.ts is different, keep yours: the pages only need
// an exported `supabase` client. Keys come from .env.local (never commit it).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local (and to Vercel → Settings → Environment Variables).",
  );
}

export const supabase = createClient(url, key);
