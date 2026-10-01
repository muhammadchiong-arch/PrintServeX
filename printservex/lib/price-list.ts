import { findRate } from "@/lib/price";
import { getPricingData } from "@/lib/pricing-data";

export type PriceListRow = {
  sizeId: string;
  label: string; // e.g. "Short (8.5 × 11 in)"
  bw: number | null; // ₱ per page, black & white
  color: number | null; // ₱ per page, color
};

export type PriceList = {
  paperTypeName: string; // the paper type the table shows, e.g. "Bond 80gsm"
  rows: PriceListRow[];
};

/**
 * Builds the home page price table.
 * Business rule: the home page shows the first (basic) paper type only;
 * other paper types are priced in the order form.
 * Returns null if Supabase can't be reached.
 */
export async function getPriceList(): Promise<PriceList | null> {
  const data = await getPricingData();
  if (!data) return null;

  const basicType = data.types[0];
  if (!basicType) return { paperTypeName: "", rows: [] };

  return {
    paperTypeName: basicType.name,
    rows: data.sizes.map((size) => ({
      sizeId: size.id,
      label: size.label,
      bw: findRate(data.rules, { sizeId: size.id, typeId: basicType.id, color: false }),
      color: findRate(data.rules, { sizeId: size.id, typeId: basicType.id, color: true }),
    })),
  };
}
