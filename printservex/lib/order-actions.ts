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
import { priceFile, priceOrder } from "@/lib/price";
import { getPricingData, toPrices } from "@/lib/pricing-data";
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
 * - every file really is in Storage, inside this order's folder, and follows the size rule
 * - the price is calculated HERE from the database prices (the browser sends no price)
 * - the reference number comes from the database (numbered per day)
 */
export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const input = parsePlaceOrderInput(raw);
  if (!input || !UUID.test(input.batch)) return { ok: false, error: TRY_AGAIN };

  // Walk-in orders: only signed-in staff, and the customer agrees to privacy at the counter
  const staff = input.walkIn ? await getCurrentStaff() : null;
  if (input.walkIn && !staff) return { ok: false, error: "You were signed out. Sign in again, then retry." };

  const detailErrors = Object.values(validateDetails(input.customer, { requireConsent: !input.walkIn }));
  if (detailErrors.length > 0) return { ok: false, error: detailErrors[0] ?? TRY_AGAIN };
  if (input.items.length === 0 || input.items.length > UPLOAD_RULES.maxFilesPerOrder) return { ok: false, error: TRY_AGAIN };

  // Are the files really uploaded? Read their real sizes from Storage (not from the browser).
  const { data: stored, error: listError } = await supabaseAdmin.storage
    .from(ORDER_FILES_BUCKET)
    .list(input.batch, { limit: 100 });
  if (listError) {
    console.error("placeOrder: listing files failed", listError);
    return { ok: false, error: TRY_AGAIN };
  }
  const storedSizes = new Map(stored.map((o) => [`${input.batch}/${o.name}`, o.metadata?.size ?? 0]));

  // Prices straight from the database
  const pricing = await getPricingData();
  if (!pricing) return { ok: false, error: TRY_AGAIN };
  const prices = toPrices(pricing);

  const rows = [];
  const items: OrderItem[] = [];
  for (const [index, item] of input.items.entries()) {
    const bytes = storedSizes.get(item.path);
    if (!bytes || !item.path.startsWith(`${input.batch}/`)) {
      return { ok: false, error: `${item.fileName} didn't finish uploading. Please try again.` };
    }
    const fileProblem = checkFileMeta(item.fileName, bytes);
    if (fileProblem) return { ok: false, error: fileProblem };

    const size = pricing.sizes.find((s) => s.id === item.sizeId);
    const paper = pricing.types.find((t) => t.id === item.typeId);
    const price = priceFile(prices, item);
    if (!size || !paper || !price) {
      return { ok: false, error: `The options for ${item.fileName} are no longer offered. Please choose others.` };
    }

    rows.push({
      position: index + 1,
      file_name: item.fileName,
      file_size_bytes: bytes,
      storage_path: item.path,
      size_name: size.name,
      paper_name: paper.name,
      color: item.color,
      pages: item.pages,
      copies: item.copies,
      binding: item.binding,
      lamination: item.lamination,
      rate: price.rate,
      binding_price: price.binding,
      lamination_price: price.lamination,
      line_total: price.total,
    });
    items.push({
      fileName: item.fileName,
      fileSize: formatFileSize(bytes),
      size: size.name,
      paper: paper.name,
      color: item.color,
      pages: item.pages,
      copies: item.copies,
      binding: item.binding,
      lamination: item.lamination,
      rate: price.rate,
      addOnsTotal: price.binding + price.lamination,
    });
  }

  const total = priceOrder(prices, input.items).total;
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
