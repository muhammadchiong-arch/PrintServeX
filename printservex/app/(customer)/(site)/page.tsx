import { Suspense } from "react";
import { Container } from "@/components/customer/Container";
import { Faq, type FaqItem } from "@/components/customer/home/Faq";
import { Hero } from "@/components/customer/home/Hero";
import { HowItWorks } from "@/components/customer/home/HowItWorks";
import { PriceList, PriceListSkeleton } from "@/components/customer/home/PriceList";
import { SHOP, UPLOAD_RULES } from "@/lib/shop";

// Rebuild the page (and re-read prices from Supabase) at most every 5 minutes.
// Fast for visitors and uses very few Supabase / Vercel free-tier requests.
export const revalidate = 300;

const FAQ: FaqItem[] = [
  {
    q: "What files can I upload?",
    a: `${UPLOAD_RULES.fileTypes.slice(0, -1).join(", ")} and ${UPLOAD_RULES.fileTypes.at(-1)}, up to ${UPLOAD_RULES.maxFileMb} MB per file and ${UPLOAD_RULES.maxFilesPerOrder} files per order.`,
  },
  {
    q: "When can I pick up?",
    a: `${SHOP.hoursLong}. Most orders are ready ${SHOP.usualTurnaround}. Check your status page first.`,
  },
  {
    q: "Is the price final?",
    a: "It's an estimate. Staff check your files and confirm the final price, which you pay at pickup.",
  },
];

const h2 = "text-xl lg:text-3xl lg:tracking-[-0.015em]";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Container className="grid items-start gap-8 pb-8 lg:grid-cols-2 lg:gap-12 lg:pb-16">
        <section aria-labelledby="prices-title" className="flex flex-col gap-3 lg:gap-4">
          <h2 id="prices-title" className={h2}>
            Price per page
          </h2>
          {/* Shows gray placeholder rows until the prices arrive */}
          <Suspense fallback={<PriceListSkeleton />}>
            <PriceList />
          </Suspense>
        </section>
        <section aria-labelledby="faq-title" className="flex flex-col gap-3 lg:gap-4">
          <h2 id="faq-title" className={h2}>
            FAQ
          </h2>
          <Faq items={FAQ} />
        </section>
      </Container>
    </>
  );
}
