import type { PrintOptions } from "@/lib/price";
import type { PaperSize, PaperType } from "@/lib/pricing-data";

// One file the customer added, kept in the browser for now
export type OrderFile = {
  id: string;
  file: File;
  status: "reading" | "ready"; // "reading" while we count its pages
  progress: number; // 0–100
  pagesDetected: number | null; // null = we couldn't count, customer types it
  options: PrintOptions;
};

export type Catalog = { sizes: PaperSize[]; types: PaperType[] };

export const STEPS = ["Your details", "Files & options", "Review"] as const;

// "A4 · Bond 80gsm · B&W · 24 pp × 2 · Binding"
export function describeOptions(o: PrintOptions, catalog: Catalog): string {
  const size = catalog.sizes.find((s) => s.id === o.sizeId)?.name ?? "?";
  const type = catalog.types.find((t) => t.id === o.typeId)?.name ?? "?";
  return [size, type, o.color ? "Color" : "B&W", `${o.pages} pp × ${o.copies}`]
    .concat(o.binding ? ["Binding"] : [], o.lamination ? ["Lamination"] : [])
    .join(" · ");
}
