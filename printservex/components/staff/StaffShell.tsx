"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { StaffSidebar } from "./StaffSidebar";
import { useStaff } from "./StaffStore";
import { StaffTopbar } from "./StaffTopbar";

// Sidebar + top bar around every staff page. Reads the signed-in user and low-stock count from the store.
// Business rule: someone still on a temporary password sees a reminder on every page until they change it.
export function StaffShell({ children }: { children: React.ReactNode }) {
  const { me, isAdmin, inventory } = useStaff();
  const lowStock = inventory.filter((i) => i.qty <= i.reorderLevel).length;

  return (
    <div className="flex min-h-dvh">
      <StaffSidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopbar staffName={me.name} lowStockCount={lowStock} />
        <main id="main" className="flex flex-1 flex-col gap-4 p-6">
          {me.mustChangePassword && (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-pending-tint px-4 py-3 text-sm">
              <KeyRound size={18} aria-hidden className="shrink-0" />
              You&apos;re using a temporary password.
              <Link href="/staff/profile" className="font-semibold text-blue hover:underline">
                Change it now
              </Link>
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
