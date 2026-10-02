import type { Metadata } from "next";
import { Suspense } from "react";
import { Customers } from "@/components/staff/Customers";

export const metadata: Metadata = { title: "Customers · PrintServeX Staff" };

// S6
export default function CustomersPage() {
  return (
    <Suspense>
      <Customers />
    </Suspense>
  );
}
