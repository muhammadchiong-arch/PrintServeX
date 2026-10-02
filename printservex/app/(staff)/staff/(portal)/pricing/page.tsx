import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Pricing } from "@/components/staff/pricing/Pricing";
import { getPricingData } from "@/lib/pricing-data";

export const metadata: Metadata = { title: "Pricing & options · PrintServeX Staff" };
export const revalidate = 300;

// S9 (admin only). Reads the real sizes, paper types and prices from Supabase.
export default async function PricingPage() {
  const data = await getPricingData();
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
