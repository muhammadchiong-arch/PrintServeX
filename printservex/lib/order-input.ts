// What the browser sends to the server when a customer submits an order, and what comes back.
// The server never trusts this data: it checks every field again (parsePlaceOrderInput) and
// calculates the price itself. The browser does NOT send any price.

import type { CustomerDetails } from "@/lib/order-details";
import type { Order } from "@/lib/orders";
import { isLaminationSize, type PrintOptions } from "@/lib/price";
import { LIMITS, type LineDetails } from "@/lib/services";

export type FileMeta = { name: string; size: number };
export type UploadTicket = { path: string; token: string };

export type PrepareUploadsResult = { ok: true; batch: string; uploads: UploadTicket[] } | { ok: false; error: string };

// One line of the order. The server looks up the service and works out the price itself.
export type PlaceOrderItem = {
  serviceId: string;
  path: string | null; // where the file was uploaded in Storage, or null = no file
  fileName: string | null;
  options: PrintOptions | null; // Document Printing only
  details: LineDetails;
};

export type PlaceOrderInput = {
  customer: CustomerDetails;
  batch: string; // the upload folder from prepareUploads ("" when the order has no files)
  items: PlaceOrderItem[];
  walkIn: boolean; // made by staff at the counter (S5); the server checks they are signed in
};

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; error: string };

// ---------- Runtime checks (TypeScript types disappear when the code runs) ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): v is string => typeof v === "string" && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const bool = (v: unknown): v is boolean => typeof v === "boolean";

export function parseFileMetas(raw: unknown): FileMeta[] | null {
  if (!Array.isArray(raw)) return null;
  const out: FileMeta[] = [];
  for (const f of raw) {
    if (!isObj(f) || !str(f.name, 255) || !int(f.size, 0, Number.MAX_SAFE_INTEGER)) return null;
    out.push({ name: f.name, size: f.size });
  }
  return out;
}

const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const oneOf = <T extends string>(v: unknown, options: readonly T[]): v is T => typeof v === "string" && (options as readonly string[]).includes(v);

function parseOptions(o: unknown): PrintOptions | null {
  if (
    !isObj(o) ||
    !str(o.sizeId, 64) ||
    !str(o.typeId, 64) ||
    !bool(o.color) ||
    !int(o.pages, 1, 2000) ||
    !int(o.copies, 1, 99) ||
    !bool(o.binding) ||
    !bool(o.lamination) ||
    // Business rule: lamination needs one of the four sizes. Only the size is read, never a price.
    (o.lamination ? !isLaminationSize(o.laminationSize) : o.laminationSize !== null && o.laminationSize !== undefined && !isLaminationSize(o.laminationSize))
  ) {
    return null;
  }
  return {
    sizeId: o.sizeId,
    typeId: o.typeId,
    color: o.color,
    pages: o.pages,
    copies: o.copies,
    binding: o.binding,
    lamination: o.lamination,
    // A size without lamination means nothing, so it is dropped
    laminationSize: o.lamination && isLaminationSize(o.laminationSize) ? o.laminationSize : null,
  };
}

// Keeps only the known option fields, each with the right type. Unknown fields are dropped.
// Which fields a service needs is checked later with checkLineDetails.
function parseDetails(d: unknown): LineDetails | null {
  if (d === undefined) return {};
  if (!isObj(d)) return null;
  const out: LineDetails = {};
  if (d.quantity !== undefined) {
    if (!int(d.quantity, 1, LIMITS.quantity)) return null;
    out.quantity = d.quantity;
  }
  if (d.sides !== undefined) {
    if (!oneOf(d.sides, ["single", "double"] as const)) return null;
    out.sides = d.sides;
  }
  if (d.sizeId !== undefined) {
    if (!str(d.sizeId, 64)) return null;
    out.sizeId = d.sizeId;
  }
  if (d.color !== undefined) {
    if (!bool(d.color)) return null;
    out.color = d.color;
  }
  if (d.background !== undefined) {
    if (!oneOf(d.background, ["white", "blue", "as_is"] as const)) return null;
    out.background = d.background;
  }
  if (d.mode !== undefined) {
    if (!oneOf(d.mode, ["file", "design"] as const)) return null;
    out.mode = d.mode;
  }
  if (d.unit !== undefined) {
    if (!oneOf(d.unit, ["cm", "ft"] as const)) return null;
    out.unit = d.unit;
  }
  for (const k of ["width", "height"] as const) {
    if (d[k] === undefined) continue;
    if (!num(d[k], 0, 100_000)) return null;
    out[k] = d[k];
  }
  if (d.sizeText !== undefined) {
    if (!str(d.sizeText, LIMITS.sizeText)) return null;
    out.sizeText = d.sizeText.trim();
  }
  if (d.notes !== undefined) {
    if (!str(d.notes, LIMITS.notes)) return null;
    out.notes = d.notes.trim();
  }
  return out;
}

export function parsePlaceOrderInput(raw: unknown): PlaceOrderInput | null {
  if (!isObj(raw) || !isObj(raw.customer) || !str(raw.batch, 64) || !Array.isArray(raw.items) || raw.items.length > 50) return null;
  const c = raw.customer;
  if (!str(c.name) || !str(c.phone, 40) || !str(c.email, 254) || !bool(c.consent)) return null;

  const items: PlaceOrderItem[] = [];
  for (const i of raw.items) {
    if (!isObj(i) || !str(i.serviceId, 64)) return null;
    const hasFile = i.path !== null && i.path !== undefined;
    if (hasFile && (!str(i.path, 400) || !str(i.fileName, 255))) return null;
    const options = i.options === null || i.options === undefined ? null : parseOptions(i.options);
    if (i.options !== null && i.options !== undefined && !options) return null;
    const details = parseDetails(i.details);
    if (!details) return null;
    items.push({
      serviceId: i.serviceId,
      path: hasFile ? (i.path as string) : null,
      fileName: hasFile ? (i.fileName as string) : null,
      options,
      details,
    });
  }
  return {
    customer: { name: c.name, phone: c.phone, email: c.email, consent: c.consent },
    batch: raw.batch,
    items,
    walkIn: raw.walkIn === true,
  };
}
