import type { Metadata } from "next";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = { title: "Terms · PrintServeX" };

// Short shop terms that match how the system works. Have the shop owner review it.
export default function TermsPage() {
  return (
    <article className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-10 text-pretty [&_h2]:mt-4 [&_h2]:text-xl [&_p]:text-slate">
      <h1 className="text-3xl">Terms</h1>
      <h2>Prices</h2>
      <p>The price shown when you order is an estimate. Staff confirm the final price after checking your files, and you see it on your status page.</p>
      <h2>Payment and pickup</h2>
      <p>You pay when you pick up your order at the shop ({SHOP.hours}). Bring your reference number.</p>
      <h2>Cancelled orders</h2>
      <p>We may cancel an order we can&apos;t print, for example if the files are password protected. The reason is shown on your status page.</p>
      <h2>Questions</h2>
      <p>Call {SHOP.phone} or visit {SHOP.address}, {SHOP.area}.</p>
    </article>
  );
}
