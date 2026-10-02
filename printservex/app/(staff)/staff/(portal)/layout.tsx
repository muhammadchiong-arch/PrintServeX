import type { Metadata } from "next";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffStoreProvider } from "@/components/staff/StaffStore";

export const metadata: Metadata = { title: "PrintServeX Staff", robots: { index: false } };

// Wraps every staff page except /staff/login: navy sidebar on the left, top bar above the content.
// The store keeps all staff data in one place (sample data until Supabase is connected).
export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffStoreProvider>
      <StaffShell>{children}</StaffShell>
    </StaffStoreProvider>
  );
}
