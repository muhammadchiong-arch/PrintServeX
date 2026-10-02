"use client";

import { StaffSidebar } from "./StaffSidebar";
import { useStaff } from "./StaffStore";
import { StaffTopbar } from "./StaffTopbar";

// Sidebar + top bar around every staff page. Reads the signed-in user and low-stock count from the store.
export function StaffShell({ children }: { children: React.ReactNode }) {
  const { me, isAdmin, inventory } = useStaff();
  const lowStock = inventory.filter((i) => i.qty <= i.reorderLevel).length;

  return (
    <div className="flex min-h-dvh">
      <StaffSidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopbar staffName={me.name} lowStockCount={lowStock} />
        <main id="main" className="flex flex-1 flex-col gap-4 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
