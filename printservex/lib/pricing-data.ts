import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_LAMINATION_PRICES,
  isLaminationSize,
  LAMINATION_LABELS,
  LAMINATION_SIZE_IDS,
  type AddOn,
  type AddOnKey,
  type AddOns,
  type LaminationPrice,
  type PriceRule,
  type Prices,
} from "@/lib/price";
import { SERVICE_KINDS, type FileRule, type Service, type ServiceCategory, type ServiceKind } from "@/lib/services";

// ⚠ If your Supabase column names are different, change them here only.
const COLUMNS = {
  sizeName: "name", // paper_sizes
  sizeDimensions: "dimensions", // paper_sizes (added by supabase/007_pricing_shop.sql)
  typeName: "name", // paper_types
  ruleSizeId: "size_id", // price_rules → paper_sizes.id
  ruleTypeId: "paper_type_id", // price_rules → paper_types.id
  ruleColorMode: "color_mode", // price_rules: "bw" or "color"
  rulePrice: "price_per_page", // price_rules: peso amount
} as const;

export type PaperSize = { id: string; name: string; label: string; dimensions: string; active: boolean }; // label e.g. "Short (8.5 × 11 in)"
export type PaperType = { id: string; name: string; active: boolean };
export type AddOnRow = AddOn & { key: AddOnKey; active: boolean };

export type PricingData = {
  sizes: PaperSize[];
  types: PaperType[];
  rules: PriceRule[]; // active rules only
  addOnList: AddOnRow[];
  laminationPrices: LaminationPrice[]; // ₱ per lamination size, always ID, Short, A4, Legal
  categories: ServiceCategory[]; // in display order
  services: Service[]; // in display order (supabase/009_services.sql)
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
// Rows made before the is_active column count as active
const active = (row: DbRow) => row.is_active !== false;

// What the order form and price math need: only the active add-ons
export function toPrices(data: PricingData): Prices {
  const pick = (key: AddOnKey): AddOn | null => {
    const a = data.addOnList.find((x) => x.key === key && x.active);
    return a ? { label: a.label, price: a.price, unit: a.unit } : null;
  };
  const lamination = pick("lamination");
  const addOns: AddOns = { binding: pick("binding"), lamination: lamination && { ...lamination, sizes: data.laminationPrices } };
  return { rules: data.rules, addOns };
}

/**
 * Reads paper sizes, paper types, price rules, add-ons and the service catalog.
 * - Customers (public key): RLS returns active rows only.
 * - Staff (`all: true`, signed-in client): archived sizes and types too, for S9.
 * Returns null if Supabase can't be reached, so pages can show an error message.
 */
export async function readPricing(client: SupabaseClient, { all = false } = {}): Promise<PricingData | null> {
  // Sorted by created_at (ids are random uuids), so options show in the order they were added
  const read = (table: string) => {
    const q = client.from(table).select("*");
    return all ? q : q.eq("is_active", true);
  };
  const [sizes, types, rules, addOns, categories, services, laminationSizes] = await Promise.all([
    read("paper_sizes").order("created_at"),
    read("paper_types").order("created_at"),
    client.from("price_rules").select("*").eq("is_active", true),
    read("add_ons"),
    read("service_categories").order("sort"),
    read("services").order("sort"),
    client.from("lamination_sizes").select("key, price"),
  ]);

  const failed = [sizes, types, rules, addOns].find((r) => r.error);
  if (failed) {
    console.error("Pricing data failed to load", failed.error);
    return null;
  }
  // The service catalog comes from 009_services.sql. Without it, prices still show on the home
  // page; the order form says it can't take orders until the catalog exists.
  const catalogError = categories.error ?? services.error;
  if (catalogError) console.error("Service catalog failed to load (run supabase/009_services.sql?)", catalogError.message);
  // Lamination prices per size (010_lamination_sizes.sql). Until it is run, the default prices are used.
  if (laminationSizes.error) console.error("Lamination prices failed to load (run supabase/010_lamination_sizes.sql?)", laminationSizes.error.message);
  const savedLamination = new Map<string, number>();
  for (const row of (laminationSizes.error ? [] : (laminationSizes.data ?? [])) as DbRow[]) {
    const key = text(row, "key");
    const price = num(row, "price");
    if (isLaminationSize(key) && price !== null) savedLamination.set(key, price);
  }

  return {
    laminationPrices: LAMINATION_SIZE_IDS.map((id) => ({
      id,
      label: LAMINATION_LABELS[id],
      price: savedLamination.get(id) ?? DEFAULT_LAMINATION_PRICES[id],
    })),
    sizes: ((sizes.data ?? []) as DbRow[]).flatMap((s) => {
      const id = text(s, "id");
      const name = text(s, COLUMNS.sizeName);
      if (!id || !name) return [];
      const dims = text(s, COLUMNS.sizeDimensions) ?? "";
      return [{ id, name, label: dims ? `${name} (${dims})` : name, dimensions: dims, active: active(s) }];
    }),
    types: ((types.data ?? []) as DbRow[]).flatMap((t) => {
      const id = text(t, "id");
      const name = text(t, COLUMNS.typeName);
      return id && name ? [{ id, name, active: active(t) }] : [];
    }),
    rules: ((rules.data ?? []) as DbRow[]).flatMap((r) => {
      const sizeId = text(r, COLUMNS.ruleSizeId);
      const typeId = text(r, COLUMNS.ruleTypeId);
      const mode = text(r, COLUMNS.ruleColorMode)?.toLowerCase();
      const pricePerPage = num(r, COLUMNS.rulePrice);
      if (!sizeId || !typeId || (mode !== "bw" && mode !== "color") || pricePerPage === null) return [];
      return [{ sizeId, typeId, color: mode === "color", pricePerPage }];
    }),
    addOnList: ((addOns.data ?? []) as DbRow[]).flatMap((a): AddOnRow[] => {
      const key = text(a, "key");
      const price = num(a, "price");
      if ((key !== "binding" && key !== "lamination") || price === null) return [];
      // Binding first, like the order form
      return [{ key, label: text(a, "label") ?? key, price, unit: text(a, "unit") ?? "", active: active(a) }];
    }).sort((x, y) => (x.key === "binding" ? -1 : 1) - (y.key === "binding" ? -1 : 1)),
    categories: ((catalogError ? [] : (categories.data ?? [])) as DbRow[]).flatMap((c): ServiceCategory[] => {
      const key = text(c, "key");
      const name = text(c, "name");
      return key && name ? [{ key, name, description: text(c, "description") ?? "", icon: text(c, "icon") ?? "printer", active: active(c) }] : [];
    }),
    services: ((catalogError ? [] : (services.data ?? [])) as DbRow[]).flatMap((v): Service[] => {
      const id = text(v, "id");
      const name = text(v, "name");
      const categoryKey = text(v, "category_key");
      const kind = text(v, "kind") as ServiceKind | null;
      const fileRule = text(v, "file_rule") as FileRule | null;
      if (!id || !name || !categoryKey || !kind || !SERVICE_KINDS.includes(kind) || !fileRule) return [];
      const defaults = v.defaults && typeof v.defaults === "object" ? (v.defaults as { color?: unknown }) : {};
      return [
        {
          id,
          categoryKey,
          name,
          description: text(v, "description") ?? "",
          kind,
          unitPrice: kind === "document" ? null : num(v, "unit_price"),
          unitLabel: text(v, "unit_label") ?? "per piece",
          fileTypes: Array.isArray(v.file_types) ? v.file_types.filter((t): t is string => typeof t === "string") : [],
          fileRule,
          defaults: { color: defaults.color === true ? true : undefined },
          active: active(v),
        },
      ];
    }),
  };
}

// For customer pages and the walk-in form: active options, read with the public key
export function getPricingData(): Promise<PricingData | null> {
  return readPricing(supabase);
}
