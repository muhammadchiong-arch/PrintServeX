// ALL price calculations live in this one file.
// The browser uses it for the live estimate, and the server uses the same functions
// (with prices read from the database) for the real price, so nobody can fake a lower total.

// One row of price_rules: ₱ per printed page for a size + paper type + color mode
export type PriceRule = {
  sizeId: string;
  typeId: string;
  color: boolean;
  pricePerPage: number;
};

// An add-on from the add_ons table. Only binding and lamination exist (the math below knows them).
export type AddOn = { label: string; price: number; unit: string };
export type AddOnKey = "binding" | "lamination";
export type AddOns = Record<AddOnKey, AddOn | null>; // null = not offered right now

// Everything needed to price an order
export type Prices = { rules: PriceRule[]; addOns: AddOns };

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
 * Returns null if this size + paper + color combination has no price rule,
 * or a chosen add-on isn't offered anymore.
 */
export function priceFile({ rules, addOns }: Prices, o: PrintOptions): FilePrice | null {
  const rate = findRate(rules, o);
  if (rate === null) return null;
  if ((o.binding && !addOns.binding) || (o.lamination && !addOns.lamination)) return null;

  const printing = centavos(o.pages * o.copies * rate);
  const binding = o.binding && addOns.binding ? centavos(addOns.binding.price * o.copies) : 0;
  const lamination = o.lamination && addOns.lamination ? centavos(addOns.lamination.price * o.pages * o.copies) : 0;
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
export function priceOrder(prices: Prices, files: PrintOptions[]): OrderPrice {
  let printing = 0;
  let addOns = 0;
  let hasUnpricedFile = false;
  for (const f of files) {
    const p = priceFile(prices, f);
    if (!p) {
      hasUnpricedFile = true;
      continue;
    }
    printing += p.printing;
    addOns += p.binding + p.lamination;
  }
  return { printing: centavos(printing), addOns: centavos(addOns), total: centavos(printing + addOns), hasUnpricedFile };
}
