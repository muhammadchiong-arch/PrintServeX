import {
  Boxes,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Store,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

// Sidebar links every staff member sees
export const STAFF_NAV: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/staff/orders", icon: ClipboardList },
  { label: "Walk-in order", href: "/staff/walk-in", icon: Store },
  { label: "Customers", href: "/staff/customers", icon: Users },
  { label: "Inventory", href: "/staff/inventory", icon: Boxes },
];

// Business rule: only the Admin (shop owner) can open these pages
export const ADMIN_NAV: NavItem[] = [
  { label: "Pricing & options", href: "/staff/pricing", icon: Tags },
  { label: "Reports", href: "/staff/reports", icon: ChartColumn },
  { label: "Users", href: "/staff/users", icon: UserCog },
  { label: "Settings", href: "/staff/settings", icon: Settings },
];
