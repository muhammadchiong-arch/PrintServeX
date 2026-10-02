import type { Metadata } from "next";
import { TrackOrder } from "@/components/track/TrackOrder";
import { trackOrder } from "@/lib/track";

export const metadata: Metadata = {
  title: "Track your order · PrintServeX",
  description: "Check your print order status with your reference number and the last 4 digits of your contact number.",
};

type TrackPageProps = { searchParams: Promise<{ ref?: string | string[]; code?: string | string[] }> };

// C4 Track order + C5 Order status.
// /track?ref=…&code=1953 is looked up HERE, on the server, so the browser never reads the
// orders table. Reading searchParams makes this page run fresh on every visit (no caching).
export default async function TrackPage({ searchParams }: TrackPageProps) {
  const { ref, code } = await searchParams;
  const refText = typeof ref === "string" ? ref : "";
  const codeText = typeof code === "string" ? code : "";
  const result = refText && codeText ? await trackOrder(refText, codeText) : null;

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:py-12">
      {/* key: start the form fresh for each new search */}
      <TrackOrder key={`${refText}|${codeText}`} result={result} initialRef={refText} initialCode={codeText} />
    </div>
  );
}
