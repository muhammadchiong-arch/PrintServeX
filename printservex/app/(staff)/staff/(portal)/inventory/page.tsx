import type { Metadata } from "next";
import { Suspense } from "react";
import { Inventory } from "@/components/staff/inventory/Inventory";

export const metadata: Metadata = { title: "Inventory · PrintServeX Staff" };

// S7 (/staff/inventory?filter=low shows low-stock items only)
export default function InventoryPage() {
  return (
    <Suspense>
      <Inventory />
    </Suspense>
  );
}
