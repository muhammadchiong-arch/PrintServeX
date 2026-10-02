import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackOrder } from "@/components/track/TrackOrder";

export const metadata: Metadata = {
  title: "Track your order · PrintServeX",
  description: "Check your print order status with your reference number and the last 4 digits of your contact number.",
};

// C4 Track order + C5 Order status
export default function TrackPage() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:py-12">
      <Suspense>
        <TrackOrder />
      </Suspense>
    </div>
  );
}
