import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

type StaffTopbarProps = {
  staffName: string;
  // Number of inventory items at or below their reorder level
  lowStockCount: number;
};

export function StaffTopbar({ staffName, lowStockCount }: StaffTopbarProps) {
  return (
    <header className="sticky top-0 print:hidden z-30 flex h-[60px] items-center gap-4 border-b border-border bg-surface px-6">
      {/* A plain form: pressing Enter opens the Orders list filtered by what was typed */}
      <form action="/staff/orders" role="search" className="relative w-[400px] max-w-full">
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
        <input
          id="order-search"
          name="q"
          type="search"
          placeholder="Search ref no., name or contact"
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-slate focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20"
        />
      </form>

      {/* Reminder that nothing is saved yet (remove when Supabase is connected) */}
      <span
        title="Changes are kept until you reload the page"
        className="ml-auto rounded-full border border-dashed border-[#b9c6da] px-2.5 py-0.5 text-xs font-medium text-slate"
      >
        Sample data
      </span>

      <Link
        href="/staff/inventory?filter=low"
        aria-label={lowStockCount > 0 ? `${lowStockCount} items low on stock` : "No low-stock items"}
        className="relative flex size-9 items-center justify-center rounded-lg text-navy transition-colors duration-150 hover:bg-bg"
      >
        <Bell size={20} aria-hidden />
        {lowStockCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cancelled px-1 text-[11px] font-semibold text-white"
          >
            {lowStockCount}
          </span>
        )}
      </Link>

      <ProfileMenu name={staffName} />
    </header>
  );
}
