// ALL price calculations live in this one file.
// The browser uses it for the live estimate, and the server uses the same functions
// (with prices read from the database) for the real price, so nobody can fake a lower total.

import { areaSqFt, checkLineDetails, type LineDetails, type Service } from "@/lib/services";

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

// Everything needed to price an order (services carry their own unit price)
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

// One line of an order: a service, its options and whether a file is attached
export type LineInput = { service: Service; options: PrintOptions; details: LineDetails; hasFile: boolean };

// "priced" = we can estimate it now · "quote" = staff set the price (the service has no price yet)
export type LinePrice = { status: "priced"; total: number; file: FilePrice | null } | { status: "quote" };

/**
 * Price of one line. Business rules:
 * - Document Printing: per page from price_rules, plus binding / lamination (priceFile).
 * - Large-Format: unit price × square feet × quantity.
 * - Every other service: unit price × quantity.
 * - A service without a unit price is "quote": staff confirm it, it isn't added to the estimate.
 * Returns null if the line isn't valid yet (missing options, combination not offered).
 */
export function priceLine(prices: Prices, line: LineInput, sizeIds: string[]): LinePrice | null {
  if (checkLineDetails(line.service, line.details, line.hasFile, sizeIds)) return null;
  if (line.service.kind === "document") {
    const file = priceFile(prices, line.options);
    return file ? { status: "priced", total: file.total, file } : null;
  }
  const unit = line.service.unitPrice;
  if (unit === null) return { status: "quote" };
  const quantity = line.details.quantity ?? 1;
  const area = line.service.kind === "large_format" ? (areaSqFt(line.details) ?? 0) : 1;
  return { status: "priced", total: centavos(unit * area * quantity), file: null };
}

export type OrderPrice = {
  total: number; // estimate of the priced lines
  quoteCount: number; // lines staff will price
  invalidCount: number; // lines that still need fixing
};

// Adds up all lines in the order
export function priceOrder(prices: Prices, lines: LineInput[], sizeIds: string[]): OrderPrice {
  let total = 0;
  let quoteCount = 0;
  let invalidCount = 0;
  for (const line of lines) {
    const p = priceLine(prices, line, sizeIds);
    if (!p) invalidCount++;
    else if (p.status === "quote") quoteCount++;
    else total += p.total;
  }
  return { total: centavos(total), quoteCount, invalidCount };
}
