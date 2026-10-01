// Business rule: an order moves Pending → Processing → Ready for Pickup → Completed.
// It can be Cancelled (with a reason) before it is completed.
export const ORDER_STATUSES = ["pending", "processing", "ready", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};
