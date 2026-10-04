// What an order needs from inventory before it can be printed.
// The SAME formula is in supabase/011_inventory_links.sql (order_material_needs), which really checks
// and takes the stock when printing starts. This copy only shows staff what will be checked.

import { LAMINATION_LABELS, isLaminationSize } from "@/lib/price";
import type { Order, OrderItem } from "@/lib/orders";
import type { InventoryItem } from "@/lib/staff-types";

export type MaterialNeed = {
  label: string; // e.g. "Paper A4 · Bond 80gsm" or "Lamination film A4"
  need: number;
  item: InventoryItem | null; // null = no inventory item is linked to this material
  state: "ok" | "short" | "untracked";
};

// Printed sheets of one document line: pages ÷ 2 when double-sided (rounded up) × copies
export function sheetsOf(i: OrderItem): number {
  if (i.kind !== "document" || i.pages === null || i.copies === null) return 0;
  return Math.ceil(i.pages / (i.details?.sides === "double" ? 2 : 1)) * i.copies;
}

export function materialNeeds(order: Order, inventory: InventoryItem[]): MaterialNeed[] {
  const needs = new Map<string, MaterialNeed>(); // one row per material, needs added together
  const add = (key: string, label: string, need: number, item: InventoryItem | null) => {
    if (need <= 0) return;
    const row = needs.get(key) ?? { label: item?.name ?? label, need: 0, item, state: "untracked" as const };
    row.need += need;
    needs.set(key, row);
  };

  for (const i of order.items) {
    const d = i.details ?? {};
    // Paper: only Document lines placed after inventory linking know their paper ids
    if (i.kind === "document" && d.sizeId && d.typeId) {
      const item = inventory.find((x) => x.link?.kind === "paper" && x.link.sizeId === d.sizeId && x.link.typeId === d.typeId) ?? null;
      add(`paper:${d.sizeId}:${d.typeId}`, `Paper ${i.size ?? ""} · ${i.paper ?? ""}`.trim(), sheetsOf(i), item);
    }
    // Lamination film: documents per printed sheet, Photo & ID per piece
    if (i.lamination && isLaminationSize(d.laminationSize)) {
      const size = d.laminationSize;
      const item = inventory.find((x) => x.link?.kind === "lamination" && x.link.size === size) ?? null;
      add(`lam:${size}`, `Lamination film ${LAMINATION_LABELS[size]}`, i.kind === "document" ? sheetsOf(i) : i.quantity, item);
    }
  }

  return [...needs.values()].map((n) => ({ ...n, state: !n.item ? "untracked" : n.item.qty >= n.need ? "ok" : "short" }));
}
