// SERVER ONLY. This client uses the secret service role key, which skips the RLS rules,
// so every function that uses it must do its own checks first.
// "server-only" makes the build fail if a browser component ever imports this file.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and to Vercel → Settings → Environment Variables). It must NOT start with NEXT_PUBLIC_.',
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// The private bucket that holds the customers' files (created in supabase/003_orders.sql)
export const ORDER_FILES_BUCKET = "order-files";
