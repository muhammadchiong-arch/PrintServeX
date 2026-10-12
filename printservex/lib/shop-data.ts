// Reads the shop details (shop_settings, one row) for server pages.
// Customer pages are rebuilt at most every 5 minutes, and right away when an admin
// saves Settings → Shop info (revalidatePath in lib/admin-actions.ts).
import "server-only";
import { cache } from "react";
import { PAYMENT_FALLBACK, type PaymentSettings } from "@/lib/payments";
import { SHOP_FALLBACK, SHOP_PUBLIC_BUCKET, type Shop } from "@/lib/shop";
import { supabase } from "@/lib/supabase";

export const getShop = cache(async (): Promise<Shop> => {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("name, area, address, phone, email, hours, hours_long, usual_turnaround, pickup_note")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("shop_settings:", error.message);
    return SHOP_FALLBACK;
  }
  return {
    name: data.name,
    area: data.area,
    address: data.address,
    phone: data.phone,
    email: data.email ?? "",
    hours: data.hours,
    hoursLong: data.hours_long,
    usualTurnaround: data.usual_turnaround,
    pickupNote: data.pickup_note,
  };
});

// Settings → Payment (supabase/014_payments.sql). Before 014 is run: cash at pickup only.
export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("cash_enabled, gcash_enabled, gcash_qr_path, gcash_account_name, payment_instructions, receipt_required")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("payment settings (run supabase/014_payments.sql?):", error.message);
    return PAYMENT_FALLBACK;
  }
  const qrPath: string | null = data.gcash_qr_path;
  return {
    cashEnabled: data.cash_enabled,
    gcashEnabled: data.gcash_enabled,
    qrPath,
    qrUrl: qrPath ? supabase.storage.from(SHOP_PUBLIC_BUCKET).getPublicUrl(qrPath).data.publicUrl : null,
    accountName: data.gcash_account_name ?? "",
    instructions: data.payment_instructions ?? "",
    receiptRequired: data.receipt_required,
  };
});
