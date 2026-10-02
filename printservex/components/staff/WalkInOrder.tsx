"use client";

import { useRouter } from "next/navigation";
import { OrderWizard } from "@/components/order/OrderWizard";
import { useToast } from "@/components/ui/Toast";
import { submitOrder } from "@/lib/customer-orders";
import type { PriceRule } from "@/lib/price";
import type { Catalog } from "@/components/order/types";

// S5: the same 3 steps as the customer form (C2), inside the staff layout.
// On "Create order" the files are uploaded and the order is saved (same checks as online
// orders, priced on the server), then its detail page opens.
export function WalkInOrder(props: Catalog & { rules: PriceRule[] }) {
  const router = useRouter();
  const toast = useToast();

  return (
    <OrderWizard
      {...props}
      variant="staff"
      onSubmit={async ({ details, files }) => {
        const result = await submitOrder(details, files, { walkIn: true });
        if (!result.ok) return result.error;
        toast({ message: `Walk-in order ${result.order.ref} created.` });
        router.replace(`/staff/orders/${result.order.ref}`);
        router.refresh(); // reload the portal data so the new order is in the list
        return null;
      }}
    />
  );
}
