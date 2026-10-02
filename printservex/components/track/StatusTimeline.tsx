import { Check, CircleX, PackageCheck, Printer, Clock, CircleCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { STATUS_LABELS, type OrderStatus } from "@/lib/status";

const STEPS: OrderStatus[] = ["pending", "processing", "ready", "completed"];

const ICONS: Record<OrderStatus, LucideIcon> = {
  pending: Clock,
  processing: Printer,
  ready: PackageCheck,
  completed: CircleCheck,
  cancelled: CircleX,
};

// Text under each step that has happened
const DONE_TEXT: Record<OrderStatus, string> = {
  pending: "Order received",
  processing: "Printing started",
  ready: "Ready at the counter",
  completed: "Picked up and paid",
  cancelled: "Order cancelled",
};

// Current-step circle color (status color, never shown without the label next to it)
const CURRENT_BG: Record<OrderStatus, string> = {
  pending: "bg-pending outline-pending-tint",
  processing: "bg-processing outline-processing-tint",
  ready: "bg-ready outline-ready-tint",
  completed: "bg-completed outline-completed-tint",
  cancelled: "bg-cancelled outline-cancelled-tint",
};

type Row = { status: OrderStatus; at?: string; state: "done" | "current" | "future" };

// Pending → Processing → Ready for Pickup → Completed, or ending at Cancelled
function buildRows(order: Order): Row[] {
  const when = (s: OrderStatus) => order.history.find((h) => h.status === s)?.at;
  if (order.status === "cancelled") {
    const reached = STEPS.filter((s) => when(s));
    return [
      ...reached.map((s): Row => ({ status: s, at: when(s), state: "done" })),
      { status: "cancelled", at: when("cancelled"), state: "current" },
    ];
  }
  const current = STEPS.indexOf(order.status);
  return STEPS.map((s, i): Row => ({
    status: s,
    at: when(s),
    // A completed order has nothing left to wait for, so its last step shows as done
    state: i < current || order.status === "completed" ? "done" : i === current ? "current" : "future",
  }));
}

export function StatusTimeline({ order }: { order: Order }) {
  const rows = buildRows(order);
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => {
        const Icon = ICONS[row.status];
        const last = i === rows.length - 1;
        return (
          <li key={row.status} className="flex gap-3" aria-current={row.state === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-white",
                  row.state === "done" && "bg-navy",
                  row.state === "current" && cn("outline-4", CURRENT_BG[row.status]),
                  row.state === "future" && "border-2 border-[#cbd5e1] bg-surface",
                )}
              >
                {row.state === "done" && <Check size={14} strokeWidth={3} aria-hidden />}
                {row.state === "current" && <Icon size={14} aria-hidden />}
              </span>
              {!last && <span className={cn("min-h-6 w-0.5 flex-1", row.state === "done" ? "bg-navy" : "bg-border")} />}
            </div>
            <div className={cn(!last && "pb-4")}>
              <p className={row.state === "future" ? "font-medium text-slate" : "font-semibold"}>{STATUS_LABELS[row.status]}</p>
              <p className="text-sm text-slate">
                {row.at && `${formatDateTime(row.at)} · `}
                {row.state === "current" && row.status !== "cancelled"
                  ? "Current step"
                  : row.state === "future"
                    ? row.status === "completed"
                      ? "After payment at the counter"
                      : "Not yet"
                    : DONE_TEXT[row.status]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
