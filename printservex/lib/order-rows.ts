// Turns order rows from Supabase into the app's Order type (lib/orders.ts).
// Used by tracking now, and by the staff pages in step 7.

import { formatFileSize } from "@/lib/files";
import type { Order, PaymentMethod } from "@/lib/orders";
import type { OrderStatus } from "@/lib/status";

// The columns we read. Must match supabase/001_tables.sql.
export const ORDER_SELECT =
  "ref, source, customer_name, customer_phone, customer_email, status, estimated_total, final_amount, final_note, " +
  "cancel_reason, remarks, payment_method, paid_amount, paid_at, created_at, " +
  "order_items(position, file_name, file_size_bytes, size_name, paper_name, color, pages, copies, binding, lamination, rate), " +
  "order_status_history(status, note, actor_label, at)";

export type OrderRow = {
  ref: string;
  source: "online" | "walk-in";
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: OrderStatus;
  estimated_total: number;
  final_amount: number | null;
  final_note: string | null;
  cancel_reason: string | null;
  remarks: string | null;
  payment_method: PaymentMethod | null;
  paid_amount: number | null;
  paid_at: string | null;
  created_at: string;
  order_items: {
    position: number;
    file_name: string;
    file_size_bytes: number;
    size_name: string;
    paper_name: string;
    color: boolean;
    pages: number;
    copies: number;
    binding: boolean;
    lamination: boolean;
    rate: number;
  }[];
  order_status_history: { status: OrderStatus; note: string | null; actor_label: string; at: string }[];
};

// Numeric columns can arrive as text, so always pass them through Number()
export function rowToOrder(row: OrderRow): Order {
  const order: Order = {
    ref: row.ref,
    source: row.source,
    customer: { name: row.customer_name, phone: row.customer_phone, email: row.customer_email ?? undefined },
    items: [...row.order_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        fileName: i.file_name,
        fileSize: formatFileSize(Number(i.file_size_bytes)),
        size: i.size_name,
        paper: i.paper_name,
        color: i.color,
        pages: i.pages,
        copies: i.copies,
        binding: i.binding,
        lamination: i.lamination,
        rate: Number(i.rate),
      })),
    status: row.status,
    history: [...row.order_status_history]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((h) => ({ status: h.status, at: h.at, by: h.actor_label, note: h.note ?? undefined })),
    createdAt: row.created_at,
  };
  if (row.final_amount !== null) order.final = { amount: Number(row.final_amount), note: row.final_note ?? "" };
  if (row.cancel_reason) order.cancelReason = row.cancel_reason;
  if (row.remarks) order.remarks = row.remarks;
  if (row.payment_method && row.paid_at) {
    order.payment = { method: row.payment_method, amount: Number(row.paid_amount ?? 0), at: row.paid_at, by: "" };
  }
  return order;
}
