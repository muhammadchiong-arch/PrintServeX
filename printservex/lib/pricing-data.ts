import { supabase } from "@/lib/supabase";
import type { PriceRule } from "@/lib/price";

// ⚠ If your Supabase column names are different, change them here only.
const COLUMNS = {
  sizeName: "name", // paper_sizes
  sizeDimensions: "dimensions", // paper_sizes (optional column, not in your table yet)
  typeName: "name", // paper_types
  ruleSizeId: "size_id", // price_rules → paper_sizes.id
  ruleTypeId: "paper_type_id", // price_rules → paper_types.id
  ruleColorMode: "color_mode", // price_rules: "bw" or "color"
  rulePrice: "price_per_page", // price_rules: peso amount
} as const;

export type PaperSize = { id: string; name: string; label: string }; // label e.g. "Short (8.5 × 11 in)"
export type PaperType = { id: string; name: string };

export type PricingData = {
  sizes: PaperSize[];
  types: PaperType[];
  rules: PriceRule[];
};

type DbRow = Record<string, unknown>;

// Reads a value from a database row as text / number, without using `any`
const text = (row: DbRow, col: string): string | null => {
  const v = row[col];
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
};
const num = (row: DbRow, col: string): number | null => {
  const v = Number(row[col]);
  return row[col] !== null && row[col] !== undefined && Number.isFinite(v) ? v : null;
};

/**
 * Reads paper sizes, paper types and price rules from Supabase.
 * Returns null if Supabase can't be reached, so pages can show an error message.
 */
export async function getPricingData(): Promise<PricingData | null> {
  // 3 simple reads, joined in code. Sorted by created_at (ids are random uuids), so options
  // show in the order they were added. RLS only lets the public key see active rows.
  const [sizes, types, rules] = await Promise.all([
    supabase.from("paper_sizes").select("*").order("created_at"),
    supabase.from("paper_types").select("*").order("created_at"),
    supabase.from("price_rules").select("*"),
  ]);

  if (sizes.error || types.error || rules.error) {
    console.error("Pricing data failed to load", sizes.error ?? types.error ?? rules.error);
    return null;
  }

  return {
    sizes: ((sizes.data ?? []) as DbRow[]).flatMap((s) => {
      const id = text(s, "id");
      const name = text(s, COLUMNS.sizeName);
      if (!id || !name) return [];
      const dims = text(s, COLUMNS.sizeDimensions);
      return [{ id, name, label: dims ? `${name} (${dims})` : name }];
    }),
    types: ((types.data ?? []) as DbRow[]).flatMap((t) => {
      const id = text(t, "id");
      const name = text(t, COLUMNS.typeName);
      return id && name ? [{ id, name }] : [];
    }),
    rules: ((rules.data ?? []) as DbRow[]).flatMap((r) => {
      const sizeId = text(r, COLUMNS.ruleSizeId);
      const typeId = text(r, COLUMNS.ruleTypeId);
      const mode = text(r, COLUMNS.ruleColorMode)?.toLowerCase();
      const pricePerPage = num(r, COLUMNS.rulePrice);
      if (!sizeId || !typeId || (mode !== "bw" && mode !== "color") || pricePerPage === null) return [];
      return [{ sizeId, typeId, color: mode === "color", pricePerPage }];
    }),
  };
}
