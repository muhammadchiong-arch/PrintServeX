import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersList, OrdersSkeleton } from "@/components/staff/OrdersList";

export const metadata: Metadata = { title: "Orders · PrintServeX Staff" };

// S3 (Suspense is needed because the list reads its filters from the URL)
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersList />
    </Suspense>
  );
}
