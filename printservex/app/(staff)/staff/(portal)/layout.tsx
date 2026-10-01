import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { StaffTopbar } from "@/components/staff/StaffTopbar";

// Placeholder until staff login is connected to Supabase Auth.
// Then these will come from the logged-in user and the inventory table.
const CURRENT_STAFF = { name: "Maricel Santos", isAdmin: true };
const LOW_STOCK_COUNT = 3;

// Wraps every staff page except /staff/login: navy sidebar on the left, top bar above the content
export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <StaffSidebar isAdmin={CURRENT_STAFF.isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopbar staffName={CURRENT_STAFF.name} lowStockCount={LOW_STOCK_COUNT} />
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </div>
    </div>
  );
}
