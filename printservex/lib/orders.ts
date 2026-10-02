import { ADD_ONS } from "@/lib/add-ons";
import type { OrderStatus } from "@/lib/status";

// One printed file inside an order
export type OrderItem = {
  fileName: string;
  fileSize: string; // e.g. "3.1 MB"
  size: string; // paper size name, e.g. "A4"
  paper: string; // paper type name, e.g. "Bond 80gsm"
  color: boolean;
  pages: number;
  copies: number;
  binding: boolean;
  lamination: boolean;
  rate: number; // ₱ per page when the order was placed
};

export type StatusEvent = {
  status: OrderStatus;
  at: string; // ISO date-time
  by: string; // staff name, or "Customer" / "Online order"
  note?: string;
};

export type PaymentMethod = "cash" | "gcash";

export type Order = {
  ref: string; // PSX-YYYYMMDD-0000
  source: "online" | "walk-in";
  customer: { name: string; phone: string; email?: string };
  items: OrderItem[];
  status: OrderStatus;
  history: StatusEvent[]; // oldest first
  createdAt: string;
  final?: { amount: number; note: string }; // set by staff after checking the files
  cancelReason?: string;
  remarks?: string; // staff only
  payment?: { method: PaymentMethod; amount: number; at: string; by: string };
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", gcash: "GCash" };

// Prices are stored per item when the order is placed, so later price changes don't affect it
export function itemPrinting(i: OrderItem): number {
  return Math.round(i.pages * i.copies * i.rate * 100) / 100;
}
export function itemAddOns(i: OrderItem): number {
  const binding = i.binding ? ADD_ONS.binding.price * i.copies : 0;
  const lamination = i.lamination ? ADD_ONS.lamination.price * i.pages * i.copies : 0;
  return binding + lamination;
}
export const itemTotal = (i: OrderItem) => itemPrinting(i) + itemAddOns(i);

export const estimatedTotal = (o: Order) => o.items.reduce((sum, i) => sum + itemTotal(i), 0);

// The amount the customer pays: the final price if staff set one, otherwise the estimate
export const amountDue = (o: Order) => o.final?.amount ?? estimatedTotal(o);

// "A4 · Bond 80gsm · B&W · 24 pp × 2 · Binding"
export function describeItem(i: OrderItem): string {
  return [i.size, i.paper, i.color ? "Color" : "B&W", `${i.pages} pp × ${i.copies}`]
    .concat(i.binding ? ["Binding"] : [], i.lamination ? ["Lamination"] : [])
    .join(" · ");
}

// Business rule: reference numbers look like PSX-20261001-0042 (date + 4-digit number)
export const REF_PATTERN = /^PSX-\d{8}-\d{4}$/;

// Business rule: the next step staff can take for each status (S4 shows only this)
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "processing",
  processing: "ready",
  ready: "completed",
};

// Orders can be cancelled until they are ready for pickup
export const canCancel = (s: OrderStatus) => s === "pending" || s === "processing";
