import { CircleCheck, CircleX, Clock, PackageCheck, Printer, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { STATUS_LABELS, type OrderStatus } from "@/lib/status";

type BadgeKind = OrderStatus | "low_stock" | "out_of_stock";

// Accessibility rule: every status shows an icon + text, never color alone
const styles: Record<BadgeKind, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: "bg-pending-tint text-pending" },
  processing: { icon: Printer, className: "bg-processing-tint text-processing" },
  ready: { icon: PackageCheck, className: "bg-ready-tint text-ready" },
  completed: { icon: CircleCheck, className: "bg-completed-tint text-completed" },
  cancelled: { icon: CircleX, className: "bg-cancelled-tint text-cancelled" },
  low_stock: { icon: TriangleAlert, className: "bg-cancelled-tint text-cancelled" },
  out_of_stock: { icon: CircleX, className: "bg-cancelled-tint text-cancelled" },
};

type StatusBadgeProps = {
  status: BadgeKind;
  // sm for table rows, md everywhere else
  size?: "sm" | "md";
  className?: string;
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const { icon: Icon, className: color } = styles[status];
  const label = status === "low_stock" ? "Low stock" : status === "out_of_stock" ? "Out of stock" : STATUS_LABELS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 font-semibold",
        size === "sm" ? "py-0.5 text-xs" : "py-1 text-[13px]",
        color,
        className,
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} aria-hidden strokeWidth={2.25} />
      {label}
    </span>
  );
}
