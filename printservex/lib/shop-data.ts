// Reads the shop details (shop_settings, one row) for server pages.
// Customer pages are rebuilt at most every 5 minutes, and right away when an admin
// saves Settings → Shop info (revalidatePath in lib/admin-actions.ts).
import "server-only";
import { cache } from "react";
import { SHOP_FALLBACK, type Shop } from "@/lib/shop";
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
