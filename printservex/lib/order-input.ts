// What the browser sends to the server when a customer submits an order, and what comes back.
// The server never trusts this data: it checks every field again (parsePlaceOrderInput) and
// calculates the price itself. The browser does NOT send any price.

import type { CustomerDetails } from "@/lib/order-details";
import type { Order } from "@/lib/orders";
import type { PrintOptions } from "@/lib/price";

export type FileMeta = { name: string; size: number };
export type UploadTicket = { path: string; token: string };

export type PrepareUploadsResult = { ok: true; batch: string; uploads: UploadTicket[] } | { ok: false; error: string };

export type PlaceOrderItem = PrintOptions & {
  path: string; // where the file was uploaded in Storage
  fileName: string;
};

export type PlaceOrderInput = {
  customer: CustomerDetails;
  batch: string; // the upload folder from prepareUploads
  items: PlaceOrderItem[];
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

export function parsePlaceOrderInput(raw: unknown): PlaceOrderInput | null {
  if (!isObj(raw) || !isObj(raw.customer) || !str(raw.batch, 64) || !Array.isArray(raw.items)) return null;
  const c = raw.customer;
  if (!str(c.name) || !str(c.phone, 40) || !str(c.email, 254) || !bool(c.consent)) return null;

  const items: PlaceOrderItem[] = [];
  for (const i of raw.items) {
    if (
      !isObj(i) ||
      !str(i.path, 400) ||
      !str(i.fileName, 255) ||
      !str(i.sizeId, 64) ||
      !str(i.typeId, 64) ||
      !bool(i.color) ||
      !int(i.pages, 1, 2000) ||
      !int(i.copies, 1, 99) ||
      !bool(i.binding) ||
      !bool(i.lamination)
    ) {
      return null;
    }
    items.push({
      path: i.path,
      fileName: i.fileName,
      sizeId: i.sizeId,
      typeId: i.typeId,
      color: i.color,
      pages: i.pages,
      copies: i.copies,
      binding: i.binding,
      lamination: i.lamination,
    });
  }
  return { customer: { name: c.name, phone: c.phone, email: c.email, consent: c.consent }, batch: raw.batch, items };
}
