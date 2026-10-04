// The service catalog (supabase/009_services.sql) and the rules for each kind of service.
// Used by the order form in the browser AND by the server, so both check the same things.

export type ServiceKind = "document" | "finishing" | "photo" | "design" | "large_format" | "custom" | "school_business";
export type FileRule = "required" | "optional" | "none";

export type ServiceCategory = { key: string; name: string; description: string; icon: string; active: boolean };

export type Service = {
  id: string;
  categoryKey: string;
  name: string;
  description: string;
  kind: ServiceKind;
  unitPrice: number | null; // null = price to be confirmed by staff (document: priced per page instead)
  unitLabel: string; // e.g. "per set"
  fileTypes: string[]; // allowed extensions, e.g. ["jpg", "jpeg", "png"]
  fileRule: FileRule;
  defaults: { color?: boolean };
  active: boolean;
};

export const SERVICE_KINDS: ServiceKind[] = ["document", "finishing", "photo", "design", "large_format", "custom", "school_business"];

// Kinds where every uploaded file is its own line (a thesis in 3 files = 3 lines).
// The other kinds are one line per service, with at most one file.
export const multiFile = (s: Pick<Service, "fileRule">) => s.fileRule === "required";

/**
 * The options a customer fills in for one line, besides the print options of Document Printing.
 * Which fields apply depends on the kind (see checkLineDetails).
 */
export type LineDetails = {
  quantity?: number; // all kinds except document (document uses copies)
  sides?: "single" | "double"; // document
  sizeId?: string; // finishing, school_business: a paper size
  sizeName?: string; // set by the server from sizeId, so old orders keep the name
  color?: boolean; // school_business
  background?: "white" | "blue" | "as_is"; // photo
  mode?: "file" | "design"; // design: "I have a file" or "Design it for me"
  sizeText?: string; // design, custom: free text, e.g. "5 × 7 in"
  width?: number; // large_format
  height?: number; // large_format
  unit?: "cm" | "ft"; // large_format
  notes?: string; // instructions for staff
  // Lamination size: chosen by the customer (photo), or set by the server from the print options (document)
  laminationSize?: "id" | "short" | "a4" | "legal";
  laminationRate?: number; // ₱ per sheet / piece at order time, always set by the server
};

export const LIMITS = {
  quantity: 1000,
  notes: 500,
  sizeText: 60,
  // Large format: 10 cm to 10 m, or 0.5 ft to 40 ft per side
  cm: { min: 10, max: 1000 },
  ft: { min: 0.5, max: 40 },
} as const;

export const BACKGROUND_LABELS = { white: "White background", blue: "Blue background", as_is: "Keep my background" } as const;
const CM_PER_FT = 30.48;

// Starting options for a new line of this service
export function defaultDetails(service: Service, defaultSizeId: string): LineDetails {
  switch (service.kind) {
    case "document":
      return { sides: "single" };
    case "finishing":
      return { quantity: 1, sizeId: defaultSizeId, notes: "" };
    case "photo":
      return { quantity: 1, background: "as_is", notes: "" };
    case "design":
      return { quantity: 1, mode: "design", sizeText: "", notes: "" };
    case "large_format":
      return { quantity: 1, unit: "ft", notes: "" };
    case "custom":
      return { quantity: 1, sizeText: "", notes: "" };
    case "school_business":
      return { quantity: 1, sizeId: defaultSizeId, color: false, notes: "" };
  }
}

// Square feet of one large-format piece, or null if the size is missing / out of range
export function areaSqFt(d: LineDetails): number | null {
  const unit = d.unit ?? "ft";
  const range = LIMITS[unit];
  const ok = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v >= range.min && v <= range.max;
  if (!ok(d.width) || !ok(d.height)) return null;
  const toFt = (v: number) => (unit === "cm" ? v / CM_PER_FT : v);
  return Math.round(toFt(d.width) * toFt(d.height) * 100) / 100;
}

const isQuantity = (q: unknown) => Number.isInteger(q) && (q as number) >= 1 && (q as number) <= LIMITS.quantity;
const hasLength = (s: string | undefined, max: number) => (s ?? "").length <= max;

/**
 * Checks the options of one line. Returns a message for the customer, or null when it's fine.
 * `sizeIds` = the paper sizes the shop offers. Document print options are checked by priceFile.
 */
export function checkLineDetails(service: Service, d: LineDetails, hasFile: boolean, sizeIds: string[]): string | null {
  if (service.fileRule === "required" && !hasFile) return `Upload a file for ${service.name}.`;
  if (service.fileRule === "none" && hasFile) return `${service.name} doesn't take a file.`;
  if (!hasLength(d.notes, LIMITS.notes)) return `Keep the notes under ${LIMITS.notes} characters.`;
  // Lamination as a line option is for Photo & ID only (documents use their print options)
  if (d.laminationSize !== undefined && service.kind !== "photo") return "Lamination isn't offered for this service.";
  if (service.kind === "document") return d.sides === "single" || d.sides === "double" ? null : "Choose single- or double-sided.";

  if (!isQuantity(d.quantity)) return `Enter a quantity from 1 to ${LIMITS.quantity}.`;
  switch (service.kind) {
    case "finishing":
      return d.sizeId && sizeIds.includes(d.sizeId) ? null : "Choose a paper size.";
    case "school_business":
      if (!d.sizeId || !sizeIds.includes(d.sizeId)) return "Choose a paper size.";
      return typeof d.color === "boolean" ? null : "Choose B&W or color.";
    case "photo":
      return d.background && d.background in BACKGROUND_LABELS ? null : "Choose a background.";
    case "design":
      if (!hasLength(d.sizeText, LIMITS.sizeText)) return `Keep the size under ${LIMITS.sizeText} characters.`;
      if (d.mode === "file") return hasFile ? null : "Upload your file, or choose “Design it for me”.";
      if (d.mode === "design") return (d.notes ?? "").trim().length >= 5 ? null : "Tell us what to design (at least a few words).";
      return "Choose how you want it done.";
    case "custom":
      return hasLength(d.sizeText, LIMITS.sizeText) ? null : `Keep the size under ${LIMITS.sizeText} characters.`;
    case "large_format": {
      const range = LIMITS[d.unit ?? "ft"];
      return areaSqFt(d) !== null ? null : `Enter a width and height from ${range.min} to ${range.max} ${d.unit ?? "ft"}.`;
    }
  }
}

// "jpg, jpeg, png" → "JPG or PNG" (jpeg is the same as jpg)
export function fileTypesText(types: string[]): string {
  const names = [...new Set(types.map((t) => (t === "jpeg" ? "jpg" : t).toUpperCase()))];
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : (names[0] ?? "");
}
