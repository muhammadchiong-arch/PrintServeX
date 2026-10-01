// ALL price calculations live in this one file.
// Today the browser uses it for the live estimate. Later the server will use the
// same functions to calculate the real price, so a customer can't fake a lower total.

import { ADD_ONS } from "@/lib/add-ons";

// One row of price_rules: ₱ per printed page for a size + paper type + color mode
export type PriceRule = {
  sizeId: string;
  typeId: string;
  color: boolean;
  pricePerPage: number;
};

// The options a customer picks for one file
export type PrintOptions = {
  sizeId: string;
  typeId: string;
  color: boolean;
  pages: number; // pages to print, per copy
  copies: number;
  binding: boolean;
  lamination: boolean;
};

export type FilePrice = {
  rate: number; // ₱ per page
  printing: number; // pages × copies × rate
  binding: number;
  lamination: number;
  total: number;
};

// Finds the ₱-per-page price for a size + paper type + color, or null if the shop doesn't offer it
export function findRate(rules: PriceRule[], pick: Pick<PrintOptions, "sizeId" | "typeId" | "color">): number | null {
  const rule = rules.find((r) => r.sizeId === pick.sizeId && r.typeId === pick.typeId && r.color === pick.color);
  return rule ? rule.pricePerPage : null;
}

// Rounds to centavos so ₱0.1 + ₱0.2 shows as ₱0.30, not ₱0.30000000000000004
const centavos = (n: number) => Math.round(n * 100) / 100;

/**
 * Price of one file. Business rules:
 * - Printing = pages × copies × price per page.
 * - Binding is per set: each copy is bound separately.
 * - Lamination is per sheet: every printed page (single-sided) is laminated.
 * Returns null if this size + paper + color combination has no price rule.
 */
export function priceFile(rules: PriceRule[], o: PrintOptions): FilePrice | null {
  const rate = findRate(rules, o);
  if (rate === null) return null;

  const printing = centavos(o.pages * o.copies * rate);
  const binding = o.binding ? centavos(ADD_ONS.binding.price * o.copies) : 0;
  const lamination = o.lamination ? centavos(ADD_ONS.lamination.price * o.pages * o.copies) : 0;
  return { rate, printing, binding, lamination, total: centavos(printing + binding + lamination) };
}

export type OrderPrice = {
  printing: number;
  addOns: number;
  total: number;
  // True if at least one file has no price (combination not offered)
  hasUnpricedFile: boolean;
};

// Adds up all files in the order
export function priceOrder(rules: PriceRule[], files: PrintOptions[]): OrderPrice {
  let printing = 0;
  let addOns = 0;
  let hasUnpricedFile = false;
  for (const f of files) {
    const p = priceFile(rules, f);
    if (!p) {
      hasUnpricedFile = true;
      continue;
    }
    printing += p.printing;
    addOns += p.binding + p.lamination;
  }
  return { printing: centavos(printing), addOns: centavos(addOns), total: centavos(printing + addOns), hasUnpricedFile };
}
