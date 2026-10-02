import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleAlert } from "lucide-react";
import { WalkInOrder } from "@/components/staff/WalkInOrder";
import { getPricingData } from "@/lib/pricing-data";

export const metadata: Metadata = { title: "Walk-in order · PrintServeX Staff" };

// Prices come from Supabase (same as the customer form), re-read at most every 5 minutes
export const revalidate = 300;

// S5
export default async function WalkInPage() {
  const data = await getPricingData();
  if (!data || data.sizes.length === 0 || data.types.length === 0) {
    return (
      <p role="alert" className="flex gap-2 rounded-xl bg-surface p-6 text-sm shadow-card">
        <CircleAlert size={20} aria-hidden className="shrink-0 text-cancelled" />
        Prices couldn&apos;t be loaded from Supabase, so walk-in orders can&apos;t be priced right now. Refresh the page in a minute.
      </p>
    );
  }
  return (
    <Suspense>
      <WalkInOrder sizes={data.sizes} types={data.types} rules={data.rules} />
    </Suspense>
  );
}
