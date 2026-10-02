import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Pricing } from "@/components/staff/pricing/Pricing";
import { readPricing } from "@/lib/pricing-data";
import { createStaffClient } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Pricing & options · PrintServeX Staff" };

// S9 (admin only). Reads the real sizes, paper types, prices and add-ons from Supabase,
// as the signed-in staff member, so archived options are included.
export default async function PricingPage() {
  const data = await readPricing(await createStaffClient(), { all: true });
  return (
    <AdminOnly>
      {data ? (
        <Pricing data={data} />
      ) : (
        <p role="alert" className="flex gap-2 rounded-xl bg-surface p-6 text-sm shadow-card">
          <CircleAlert size={20} aria-hidden className="shrink-0 text-cancelled" />
          Prices couldn&apos;t be loaded from Supabase. Refresh the page in a minute.
        </p>
      )}
    </AdminOnly>
  );
}
