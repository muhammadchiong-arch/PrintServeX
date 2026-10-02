import { formatFileSize } from "@/lib/files";
import { normalizePhone, type CustomerDetails } from "@/lib/order-details";
import type { Order, OrderItem } from "@/lib/orders";
import { findRate, type PriceRule } from "@/lib/price";
import type { Catalog, OrderFile } from "./types";

// What the form hands over when the customer (or staff) submits
export type OrderDraft = Pick<Order, "customer" | "items">;

// Turns the form's state into order data, keeping the price per page at the time of ordering
export function buildOrderDraft(details: CustomerDetails, files: OrderFile[], catalog: Catalog, rules: PriceRule[]): OrderDraft {
  const items: OrderItem[] = files.map(({ file, options: o }) => ({
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    size: catalog.sizes.find((s) => s.id === o.sizeId)?.name ?? "?",
    paper: catalog.types.find((t) => t.id === o.typeId)?.name ?? "?",
    color: o.color,
    pages: o.pages,
    copies: o.copies,
    binding: o.binding,
    lamination: o.lamination,
    rate: findRate(rules, o) ?? 0,
  }));

  return {
    customer: {
      name: details.name.trim(),
      phone: normalizePhone(details.phone),
      email: details.email.trim() || undefined,
    },
    items,
  };
}
