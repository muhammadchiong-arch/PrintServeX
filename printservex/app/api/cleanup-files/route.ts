// Daily cleanup of uploaded files (rules in lib/file-cleanup.ts).
// Vercel calls this once a day (vercel.json → crons) and sends
// "Authorization: Bearer <CRON_SECRET>". Anyone else gets 401.
import { timingSafeEqual } from "node:crypto";
import { cleanupFiles } from "@/lib/file-cleanup";

// Several list/delete calls to Storage; allow up to a minute
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not set up: never run for anyone
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await cleanupFiles()) });
  } catch (e) {
    console.error("cleanup-files:", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
