"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, STAFF_NAV, type NavItem } from "./nav";

type StaffSidebarProps = {
  // Admin-only links are hidden for regular staff
  isAdmin: boolean;
};

export function StaffSidebar({ isAdmin }: StaffSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 print:hidden flex h-dvh w-60 shrink-0 flex-col gap-1 overflow-y-auto bg-navy px-3 py-5 text-[#c9d2e3]">
      <Link href="/staff/dashboard" className="mb-4 flex items-center gap-2 rounded-lg px-2">
        <Image src="/app-icon.png" alt="" width={32} height={32} className="size-8" />
        <span className="font-heading text-lg font-semibold text-white">PrintServeX</span>
      </Link>
      <nav aria-label="Staff" className="flex flex-col gap-1">
        {STAFF_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        {isAdmin && (
          <>
            <span className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8f9bb3]">
              Admin only
            </span>
            {ADMIN_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150",
        "focus-visible:outline-white",
        active ? "bg-white/10 font-semibold text-white" : "hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={18} aria-hidden />
      {item.label}
    </Link>
  );
}
