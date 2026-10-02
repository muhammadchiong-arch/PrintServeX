import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffStoreProvider } from "@/components/staff/StaffStore";
import { loadStaffData } from "@/lib/staff-data";
import { requireStaff } from "@/lib/staff-session";

export const metadata: Metadata = { title: "PrintServeX Staff", robots: { index: false } };

// Wraps every staff page except /staff/login: navy sidebar on the left, top bar above the content.
// All portal data is loaded here from Supabase, as the signed-in staff member (RLS applies).
// Note: a layout isn't checked again on every click inside the portal, so every staff
// Server Action (lib/staff-actions.ts) checks getCurrentStaff() itself too.
export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const data = await loadStaffData();

  if (!data) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-4">
        <p role="alert" className="flex max-w-md gap-2 rounded-xl bg-surface p-6 text-sm shadow-card">
          <CircleAlert size={20} aria-hidden className="shrink-0 text-cancelled" />
          The staff data couldn&apos;t be loaded from Supabase. Refresh the page in a minute. If it keeps happening, check that
          supabase/006_staff_work.sql was run.
        </p>
      </main>
    );
  }

  return (
    <StaffStoreProvider me={me} data={data}>
      <StaffShell>{children}</StaffShell>
    </StaffStoreProvider>
  );
}
