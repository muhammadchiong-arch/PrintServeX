"use server";

// Server Actions for the customer order form (C2 → C3). These run ONLY on the server.
// Anyone can call them with a hand-made request, so every input is checked again here.

import { randomUUID } from "node:crypto";
import { checkFileMeta, formatFileSize } from "@/lib/files";
import { normalizePhone, validateDetails } from "@/lib/order-details";
import {
  parseFileMetas,
  parsePlaceOrderInput,
  type PlaceOrderResult,
  type PrepareUploadsResult,
} from "@/lib/order-input";
import type { Order, OrderItem } from "@/lib/orders";
import { priceLine } from "@/lib/price";
import { getPricingData, toPrices } from "@/lib/pricing-data";
import { checkLineDetails } from "@/lib/services";
import { getCurrentStaff } from "@/lib/staff-session";
import { UPLOAD_RULES } from "@/lib/shop";
import { ORDER_FILES_BUCKET, supabaseAdmin } from "@/lib/supabase-admin";

const TRY_AGAIN = "We couldn't save your order. Please try again, or call the shop.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// "Thesis Ch.1 (final).pdf" → "Thesis-Ch.1-final-.pdf" (Storage only accepts simple names)
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-100);

/**
 * Step 1 of submitting: checks the files and gives the browser one-time upload links.
 * The files then go straight from the browser to Supabase Storage. They don't pass through
 * our server, because Vercel's free plan only accepts about 4.5 MB per request.
 */
export async function prepareUploads(raw: unknown): Promise<PrepareUploadsResult> {
  const files = parseFileMetas(raw);
  if (!files || files.length === 0) return { ok: false, error: "Add at least one file." };
  if (files.length > UPLOAD_RULES.maxFilesPerOrder) {
    return { ok: false, error: `You can send up to ${UPLOAD_RULES.maxFilesPerOrder} files per order.` };
  }
  for (const f of files) {
    const problem = checkFileMeta(f.name, f.size);
    if (problem) return { ok: false, error: problem };
  }

  // Each order gets its own random folder, so nobody can guess another customer's files
  const batch = randomUUID();
  try {
    const uploads = await Promise.all(
      files.map(async (f, i) => {
        const { data, error } = await supabaseAdmin.storage
          .from(ORDER_FILES_BUCKET)
          .createSignedUploadUrl(`${batch}/${i + 1}-${safeName(f.name)}`);
        if (error) throw error;
        return { path: data.path, token: data.token };
      }),
    );
    return { ok: true, batch, uploads };
  } catch (e) {
    console.error("prepareUploads failed", e);
    return { ok: false, error: TRY_AGAIN };
  }
}

/**
 * Step 2 of submitting: saves the order after the files are uploaded.
 * Business rules checked here, on the server:
 * - customer details are valid and the privacy box was checked
 * - every service exists and is still offered; its file rule and file types are followed
 * - every file really is in Storage, inside this order's folder, and follows the size rule
 * - the price is calculated HERE from the database prices (the browser sends no price);
 *   services without a price are saved as "to be confirmed" (line_total null)
 * - the reference number comes from the database (numbered per day)
 */
export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const input = parsePlaceOrderInput(raw);
  const withFiles = input?.items.filter((i) => i.path !== null) ?? [];
  if (!input || (withFiles.length > 0 && !UUID.test(input.batch))) return { ok: false, error: TRY_AGAIN };

  // Walk-in orders: only signed-in staff, and the customer agrees to privacy at the counter
  const staff = input.walkIn ? await getCurrentStaff() : null;
  if (input.walkIn && !staff) return { ok: false, error: "You were signed out. Sign in again, then retry." };

  const detailErrors = Object.values(validateDetails(input.customer, { requireConsent: !input.walkIn }));
  if (detailErrors.length > 0) return { ok: false, error: detailErrors[0] ?? TRY_AGAIN };
  if (input.items.length === 0 || input.items.length > UPLOAD_RULES.maxFilesPerOrder) return { ok: false, error: TRY_AGAIN };

  // Are the files really uploaded? Read their real sizes from Storage (not from the browser).
  const storedSizes = new Map<string, number>();
  if (withFiles.length > 0) {
    const { data: stored, error: listError } = await supabaseAdmin.storage.from(ORDER_FILES_BUCKET).list(input.batch, { limit: 100 });
    if (listError) {
      console.error("placeOrder: listing files failed", listError);
      return { ok: false, error: TRY_AGAIN };
    }
    for (const o of stored) storedSizes.set(`${input.batch}/${o.name}`, o.metadata?.size ?? 0);
  }

  // Services and prices straight from the database (active ones only)
  const pricing = await getPricingData();
  if (!pricing) return { ok: false, error: TRY_AGAIN };
  const prices = toPrices(pricing);
  const sizeIds = pricing.sizes.map((s) => s.id);

  const rows = [];
  const items: OrderItem[] = [];
  let total = 0;
  for (const [index, item] of input.items.entries()) {
    const service = pricing.services.find((s) => s.id === item.serviceId);
    const category = service && pricing.categories.find((c) => c.key === service.categoryKey);
    if (!service || !category) return { ok: false, error: "A service in your order is no longer offered. Please go back and choose again." };

    // The file: really uploaded to this order's folder, and a type this service accepts
    let bytes: number | null = null;
    if (item.path !== null && item.fileName !== null) {
      bytes = storedSizes.get(item.path) ?? 0;
      if (!bytes || !item.path.startsWith(`${input.batch}/`)) {
        return { ok: false, error: `${item.fileName} didn't finish uploading. Please try again.` };
      }
      const fileProblem = checkFileMeta(item.fileName, bytes, service);
      if (fileProblem) return { ok: false, error: fileProblem };
    }

    // Document Printing needs its print options; the other services don't take them
    if ((service.kind === "document") !== (item.options !== null)) return { ok: false, error: TRY_AGAIN };
    const options = item.options ?? { sizeId: "", typeId: "", color: false, pages: 1, copies: 1, binding: false, lamination: false, laminationSize: null };
    const details = { ...item.details };
    const line = { service, options, details, hasFile: bytes !== null };
    const problem = checkLineDetails(service, details, line.hasFile, sizeIds);
    if (problem) return { ok: false, error: `${service.name}: ${problem}` };
    const price = priceLine(prices, line, sizeIds);
    if (!price) {
      return { ok: false, error: `The options for ${item.fileName ?? service.name} are no longer offered. Please choose others.` };
    }
    const lineTotal = price.status === "priced" ? price.total : null;
    if (lineTotal !== null) total += lineTotal;

    // Copy names in, so later renames or archived options never change this order
    const sizeName = pricing.sizes.find((s) => s.id === (service.kind === "document" ? options.sizeId : details.sizeId))?.name;
    if (details.sizeId) details.sizeName = sizeName;
    const doc = service.kind === "document" && price.status === "priced" ? price.file : null;
    // Keep the lamination size and its price per sheet with the order (lamination_price = the subtotal)
    if (doc && doc.laminationRate !== null && options.laminationSize) {
      details.laminationSize = options.laminationSize;
      details.laminationRate = doc.laminationRate;
    }
    const paperName = doc ? pricing.types.find((t) => t.id === options.typeId)?.name : undefined;
    if (doc && (!sizeName || !paperName)) return { ok: false, error: TRY_AGAIN };
    const quantity = service.kind === "document" ? options.copies : (details.quantity ?? 1);

    rows.push({
      position: index + 1,
      service_id: service.id,
      service_name: service.name,
      category_name: category.name,
      kind: service.kind,
      quantity,
      details,
      file_name: item.fileName,
      file_size_bytes: bytes,
      storage_path: item.path,
      size_name: doc ? sizeName : null,
      paper_name: doc ? paperName : null,
      color: doc ? options.color : null,
      pages: doc ? options.pages : null,
      copies: doc ? options.copies : null,
      binding: doc ? options.binding : false,
      lamination: doc ? options.lamination : false,
      rate: doc ? doc.rate : null,
      binding_price: doc ? doc.binding : 0,
      lamination_price: doc ? doc.lamination : 0,
      line_total: lineTotal,
    });
    items.push({
      serviceName: service.name,
      categoryName: category.name,
      kind: service.kind,
      quantity,
      details,
      fileName: item.fileName,
      fileSize: bytes === null ? null : formatFileSize(bytes),
      size: doc ? (sizeName ?? null) : null,
      paper: doc ? (paperName ?? null) : null,
      color: doc ? options.color : null,
      pages: doc ? options.pages : null,
      copies: doc ? options.copies : null,
      binding: doc ? options.binding : false,
      lamination: doc ? options.lamination : false,
      rate: doc ? doc.rate : null,
      addOnsTotal: doc ? doc.binding + doc.lamination : 0,
      lineTotal,
    });
  }

  total = Math.round(total * 100) / 100;
  const customer = {
    name: input.customer.name.trim(),
    phone: normalizePhone(input.customer.phone),
    email: input.customer.email.trim() || undefined,
  };

  const { data: ref, error } = await supabaseAdmin.rpc("create_order", {
    p_source: staff ? "walk-in" : "online",
    p_customer_name: customer.name,
    p_customer_phone: customer.phone,
    p_customer_email: customer.email ?? "",
    p_estimated_total: total,
    p_items: rows,
    p_created_by: staff?.id ?? null,
    p_actor_label: staff?.name ?? "Online order",
  });
  if (error || typeof ref !== "string") {
    console.error("placeOrder: create_order failed", error);
    return { ok: false, error: TRY_AGAIN };
  }

  if (staff) {
    await supabaseAdmin.from("audit_log").insert({ actor_id: staff.id, actor_label: staff.name, action: "Walk-in order created", details: `${ref} · ${customer.name}` });
  }

  const now = new Date().toISOString();
  const order: Order = {
    ref,
    source: staff ? "walk-in" : "online",
    customer,
    items,
    status: "pending",
    createdAt: now,
    history: [staff ? { status: "pending", at: now, by: staff.name, note: "Walk-in" } : { status: "pending", at: now, by: "Online order" }],
  };
  return { ok: true, order };
}
