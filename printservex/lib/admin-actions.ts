"use server";

// Server Actions for Pricing & options (S9) and Settings → Shop info (S12). Admin only:
// checked here, and again by the admin_* database functions (supabase/007_pricing_shop.sql).
// After a save, the customer pages are rebuilt right away so they show the new prices / info.

import { revalidatePath } from "next/cache";
import { FAILED, NOT_ADMIN, staffRpc, type ActionResult } from "@/lib/action-results";
import { LAMINATION_SIZE_IDS, type AddOnKey, type LaminationSize } from "@/lib/price";
import type { Shop } from "@/lib/shop";
import { getCurrentStaff } from "@/lib/staff-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isAddOnKey = (v: unknown): v is AddOnKey => v === "binding" || v === "lamination";

async function adminRpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  const me = await getCurrentStaff();
  if (me && me.role !== "Admin") return NOT_ADMIN;
  const result = await staffRpc(fn, args);
  if (result.ok) revalidatePath("/", "layout"); // every page reads prices or shop info
  return result;
}

export type PriceCell = { sizeId: string; color: boolean; price: number | null }; // null = not offered

export async function savePrices(typeId: string, cells: PriceCell[]): Promise<ActionResult> {
  if (!UUID.test(typeId) || !Array.isArray(cells) || cells.length === 0 || cells.length > 200) return FAILED;
  const clean = [];
  for (const c of cells) {
    const priceOk = c?.price === null || (typeof c?.price === "number" && Number.isFinite(c.price));
    if (typeof c?.sizeId !== "string" || !UUID.test(c.sizeId) || typeof c.color !== "boolean" || !priceOk) return FAILED;
    clean.push({ size_id: c.sizeId, color: c.color, price: c.price });
  }
  return adminRpc("admin_save_prices", { p_type_id: typeId, p_cells: clean });
}

// kind "size" or "type"; id null = add a new one
export async function saveOption(kind: "size" | "type", id: string | null, name: string, dimensions: string): Promise<ActionResult> {
  if ((kind !== "size" && kind !== "type") || (id !== null && !UUID.test(id)) || typeof name !== "string" || typeof dimensions !== "string") return FAILED;
  return adminRpc("admin_save_option", { p_kind: kind, p_id: id, p_name: name.slice(0, 60), p_dimensions: dimensions.slice(0, 40) });
}

// Business rule: archive instead of delete, so past orders keep their details
export async function setOptionActive(kind: "size" | "type" | "addon", id: string, active: boolean): Promise<ActionResult> {
  if (typeof active !== "boolean") return FAILED;
  if (kind === "addon") {
    if (!isAddOnKey(id)) return FAILED;
    return adminRpc("admin_set_add_on_active", { p_key: id, p_active: active });
  }
  if ((kind !== "size" && kind !== "type") || !UUID.test(id)) return FAILED;
  return adminRpc("admin_set_option_active", { p_kind: kind, p_id: id, p_active: active });
}

export async function saveAddOn(key: AddOnKey, label: string, price: number, unit: string): Promise<ActionResult> {
  if (!isAddOnKey(key) || typeof label !== "string" || typeof unit !== "string" || !Number.isFinite(price)) return FAILED;
  return adminRpc("admin_save_add_on", { p_key: key, p_label: label.slice(0, 40), p_price: price, p_unit: unit.slice(0, 30) });
}

// The four lamination prices (ID, Short, A4, Legal), all saved together
export async function saveLaminationPrices(prices: Record<LaminationSize, number>): Promise<ActionResult> {
  if (!prices || typeof prices !== "object") return FAILED;
  const clean: Record<string, number> = {};
  for (const id of LAMINATION_SIZE_IDS) {
    const price = prices[id];
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 10000) return FAILED;
    clean[id] = Math.round(price * 100) / 100;
  }
  return adminRpc("admin_save_lamination_sizes", { p_prices: clean });
}

// One Photo Printing size: its price per print (null = "price to be confirmed by staff") and whether it's offered
export async function savePhotoSize(key: string, price: number | null, active: boolean): Promise<ActionResult> {
  if (typeof key !== "string" || !/^[a-z0-9-]{1,20}$/.test(key) || typeof active !== "boolean") return FAILED;
  if (price !== null && (typeof price !== "number" || !Number.isFinite(price))) return FAILED;
  return adminRpc("admin_save_photo_size", { p_key: key, p_price: price === null ? null : Math.round(price * 100) / 100, p_active: active });
}

// A service's price per unit (null = "price to be confirmed by staff") and whether it's offered
export async function saveService(id: string, unitPrice: number | null, active: boolean): Promise<ActionResult> {
  if (!UUID.test(id) || typeof active !== "boolean") return FAILED;
  if (unitPrice !== null && (typeof unitPrice !== "number" || !Number.isFinite(unitPrice))) return FAILED;
  return adminRpc("admin_save_service", { p_id: id, p_unit_price: unitPrice, p_active: active });
}

export async function saveShop(shop: Shop): Promise<ActionResult> {
  const fields = ["name", "area", "address", "phone", "email", "hours", "hoursLong", "usualTurnaround", "pickupNote"] as const;
  if (!shop || fields.some((f) => typeof shop[f] !== "string" || shop[f].length > 300)) return FAILED;
  return adminRpc("admin_save_shop", {
    p_name: shop.name,
    p_area: shop.area,
    p_address: shop.address,
    p_phone: shop.phone,
    p_email: shop.email,
    p_hours: shop.hours,
    p_hours_long: shop.hoursLong,
    p_usual_turnaround: shop.usualTurnaround,
    p_pickup_note: shop.pickupNote,
  });
}
