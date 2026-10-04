import { formatPeso } from "@/lib/format";
import { laminationSizeInfo, type LineInput, type PrintOptions } from "@/lib/price";
import type { PaperSize, PaperType } from "@/lib/pricing-data";
import { areaSqFt, BACKGROUND_LABELS, type LineDetails, type Service, type ServiceCategory } from "@/lib/services";

// One line of the order, kept in the browser until it is submitted.
// Document Printing, Photo and Large-Format: one line per uploaded file.
// The other services: one line per service, with an optional file.
export type OrderLine = {
  id: string;
  serviceId: string;
  file: File | null;
  status: "reading" | "ready"; // "reading" while we count a document's pages
  progress: number; // 0–100
  pagesDetected: number | null; // null = we couldn't count, customer types it
  options: PrintOptions; // used by Document Printing
  details: LineDetails;
};

export type Catalog = { sizes: PaperSize[]; types: PaperType[]; categories: ServiceCategory[]; services: Service[] };

export const STEPS = ["Your details", "Service", "Files & options", "Review"] as const;

export const findService = (catalog: Pick<Catalog, "services">, id: string) => catalog.services.find((s) => s.id === id);

// What the price math needs from a line
export function lineInput(line: OrderLine, service: Service): LineInput {
  return { service, options: line.options, details: line.details, hasFile: Boolean(line.file) };
}

// "A4 · Bond 80gsm · B&W · 24 pp × 2 · Binding · Lamination A4"
export function describeOptions(o: PrintOptions, catalog: Pick<Catalog, "sizes" | "types">): string {
  const size = catalog.sizes.find((s) => s.id === o.sizeId)?.name ?? "?";
  const type = catalog.types.find((t) => t.id === o.typeId)?.name ?? "?";
  return [size, type, o.color ? "Color" : "B&W", `${o.pages} pp × ${o.copies}`]
    .concat(o.binding ? ["Binding"] : [], o.lamination ? [o.laminationSize ? `Lamination ${laminationSizeInfo(o.laminationSize).label}` : "Lamination"] : [])
    .join(" · ");
}

// A short summary of one line's options, for the summary and review
export function describeLine(line: OrderLine, service: Service, catalog: Pick<Catalog, "sizes" | "types">): string {
  const d = line.details;
  const size = catalog.sizes.find((s) => s.id === d.sizeId)?.name;
  const parts: (string | undefined | false)[] = (() => {
    switch (service.kind) {
      case "document":
        return [describeOptions(line.options, catalog), d.sides === "double" && "Double-sided"];
      case "finishing":
        return [size, `× ${d.quantity}`];
      case "photo":
        return [d.background && BACKGROUND_LABELS[d.background], `× ${d.quantity}`];
      case "design":
        return [d.mode === "design" ? "Design it for me" : "Using my file", d.sizeText, `× ${d.quantity}`];
      case "large_format": {
        const area = areaSqFt(d);
        return [d.width !== undefined && d.height !== undefined && `${d.width} × ${d.height} ${d.unit}`, area !== null && `${area} sq ft`, `× ${d.quantity}`];
      }
      case "custom":
        return [d.sizeText, `× ${d.quantity}`];
      case "school_business":
        return [size, d.color ? "Color" : "B&W", `× ${d.quantity}`];
    }
  })();
  return parts.filter(Boolean).join(" · ");
}

// "₱45.00 per set", or "Price confirmed by staff" when the owner hasn't set a price
export function servicePriceText(service: Service, minPagePrice: number | null): string {
  if (service.kind === "document") return minPagePrice !== null ? `From ${formatPeso(minPagePrice)} per page` : "Priced per page";
  return service.unitPrice !== null ? `${formatPeso(service.unitPrice)} ${service.unitLabel}` : "Price confirmed by staff";
}
