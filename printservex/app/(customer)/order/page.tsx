import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { OrderWizard } from "@/components/order/OrderWizard";
import { buttonClasses } from "@/components/ui/Button";
import { getPricingData } from "@/lib/pricing-data";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = { title: "New order · PrintServeX" };

// Re-read sizes, paper types and prices from Supabase at most every 5 minutes
export const revalidate = 300;

// Server part: loads the price data once, then hands it to the form that runs in the browser
export default async function NewOrderPage() {
  const data = await getPricingData();

  // Can't take orders without prices: show a clear message instead of a broken form
  if (!data || data.sizes.length === 0 || data.types.length === 0) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <CircleAlert size={32} aria-hidden className="text-cancelled" />
        <h1 className="text-2xl">We can&apos;t take orders right now</h1>
        <p className="text-slate">
          Please try again in a few minutes, or call us at {SHOP.phone}.
        </p>
        <Link href="/" className={buttonClasses("secondary", "lg")}>
          Back to home
        </Link>
      </main>
    );
  }

  // Suspense is needed because the form reads the step from the URL (?step=2)
  return (
    <Suspense>
      <OrderWizard sizes={data.sizes} types={data.types} rules={data.rules} />
    </Suspense>
  );
}
