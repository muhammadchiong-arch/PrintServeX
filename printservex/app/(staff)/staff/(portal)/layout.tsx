import type { Metadata } from "next";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffStoreProvider } from "@/components/staff/StaffStore";
import { requireStaff } from "@/lib/staff-session";

export const metadata: Metadata = { title: "PrintServeX Staff", robots: { index: false } };

// Wraps every staff page except /staff/login: navy sidebar on the left, top bar above the content.
// The store keeps all staff data in one place (sample data until step 7, except who is signed in).
// Note: a layout isn't checked again on every click inside the portal, so from step 7 every
// staff data function and Server Action must call getCurrentStaff() itself too.
export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  return (
    <StaffStoreProvider me={me}>
      <StaffShell>{children}</StaffShell>
    </StaffStoreProvider>
  );
}
