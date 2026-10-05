import { isLaminationSize, LAMINATION_LABELS } from "@/lib/price";
import { areaSqFt, BACKGROUND_LABELS, type LineDetails, type ServiceKind } from "@/lib/services";
import type { OrderStatus } from "@/lib/status";

// One line of an order: a service with its options, and at most one file.
// Names and prices are copied when the order is placed, so later changes never affect it.
export type OrderItem = {
  serviceName: string; // e.g. "Thesis", "2×2 ID Photo"
  categoryName: string; // e.g. "Document Printing"
  kind: ServiceKind;
  quantity: number; // copies for documents
  details: LineDetails; // the options of non-document services (see lib/services.ts)
  fileName: string | null; // null = no file (e.g. "Design it for me")
  fileSize: string | null; // e.g. "3.1 MB"
  // Document Printing only (null for other services)
  size: string | null; // paper size name, e.g. "A4"
  paper: string | null; // paper type name, e.g. "Bond 80gsm"
  color: boolean | null;
  pages: number | null;
  copies: number | null;
  binding: boolean;
  lamination: boolean;
  rate: number | null; // ₱ per page when the order was placed
  addOnsTotal: number; // ₱ binding + lamination for this file, when the order was placed
  lineTotal: number | null; // ₱ for this line, or null = price to be confirmed by staff
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

// "gcash" is the value saved in the database (supabase/006, 008). People see "Online payment":
// GCash, Maya or a bank transfer, checked by staff at the counter.
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", gcash: "Online payment" };

// Prices are stored per item when the order is placed, so later price changes don't affect it
export function itemPrinting(i: OrderItem): number {
  if (i.kind !== "document" || i.pages === null || i.copies === null || i.rate === null) return 0;
  return Math.round(i.pages * i.copies * i.rate * 100) / 100;
}
// "?? 0": orders kept in the browser from before this field existed
export const itemAddOns = (i: OrderItem): number => i.addOnsTotal ?? 0;
// The saved line total. Orders kept in the browser from before services existed have none.
// A "price confirmed by staff" line still counts its known add-ons (e.g. a photo's lamination).
export const itemTotal = (i: OrderItem) => (i.lineTotal !== undefined ? (i.lineTotal ?? itemAddOns(i)) : itemPrinting(i) + itemAddOns(i));
// Business rule: lines without a price are priced by staff (set as the final price)
export const isQuote = (i: OrderItem) => i.lineTotal === null;
export const quoteCount = (o: Order) => o.items.filter(isQuote).length;

// The lamination add-on of a saved line (document or Photo & ID): size, price each, how many and subtotal.
// Documents: one per printed sheet (pages × copies). Photos: one per piece (quantity).
// null = no lamination, or an order placed before lamination had sizes.
export function laminationLine(i: OrderItem) {
  const d = i.details ?? {};
  if (!i.lamination || !isLaminationSize(d.laminationSize) || typeof d.laminationRate !== "number") return null;
  const quantity = i.kind === "document" ? (i.pages ?? 0) * (i.copies ?? 0) : i.quantity;
  return {
    addOn: "Lamination",
    size: LAMINATION_LABELS[d.laminationSize],
    unitPrice: d.laminationRate,
    quantity,
    subtotal: Math.round(d.laminationRate * quantity * 100) / 100,
  };
}

// "Lamination A4", or just "Lamination" for orders placed before lamination had sizes
export const laminationLabel = (i: OrderItem) => {
  const line = laminationLine(i);
  return line ? `Lamination ${line.size}` : "Lamination";
};

export const estimatedTotal = (o: Order) => o.items.reduce((sum, i) => sum + itemTotal(i), 0);

// The amount the customer pays: the final price if staff set one, otherwise the estimate
export const amountDue = (o: Order) => o.final?.amount ?? estimatedTotal(o);

// "A4 · Bond 80gsm · B&W · 24 pp × 2 · Binding" or "White background · × 2"
export function describeItem(i: OrderItem): string {
  const d = i.details ?? {};
  let parts: (string | null | undefined | false)[];
  switch (i.kind ?? "document") {
    case "document":
      parts = [i.size, i.paper, i.color ? "Color" : "B&W", `${i.pages} pp × ${i.copies}`, i.binding && "Binding", i.lamination && laminationLabel(i), d.sides === "double" && "Double-sided"];
      break;
    case "large_format": {
      const area = areaSqFt(d);
      parts = [d.width !== undefined && d.height !== undefined && `${d.width} × ${d.height} ${d.unit}`, area !== null && `${area} sq ft`, `× ${i.quantity}`];
      break;
    }
    default:
      parts = [
        d.sizeName,
        i.kind === "school_business" && (d.color ? "Color" : "B&W"),
        i.kind === "photo" && d.photoSizeName,
        d.background && BACKGROUND_LABELS[d.background],
        i.kind === "photo" && i.lamination && laminationLabel(i),
        i.kind === "design" && (d.mode === "file" ? "Own file" : "Design service"),
        d.sizeText,
        `× ${i.quantity}`,
      ];
  }
  return parts.filter(Boolean).join(" · ");
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
