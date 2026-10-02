import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirmation } from "@/components/order/Confirmation";

export const metadata: Metadata = { title: "Order received · PrintServeX", robots: { index: false } };

// C3: shown right after the customer submits an order (/order/confirmation?ref=PSX-...)
export default function ConfirmationPage() {
  return (
    <Suspense>
      <Confirmation />
    </Suspense>
  );
}
