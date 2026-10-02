"use client";

import { useRouter } from "next/navigation";
import { submitOrder } from "@/lib/customer-orders";
import type { PriceRule } from "@/lib/price";
import { OrderWizard } from "./OrderWizard";
import type { Catalog } from "./types";

// C2 for customers: on submit, save the order and open the confirmation page (C3)
export function CustomerOrderForm(props: Catalog & { rules: PriceRule[] }) {
  const router = useRouter();
  return (
    <OrderWizard
      {...props}
      variant="customer"
      onSubmit={(draft) => {
        const order = submitOrder(draft);
        // replace (not push): pressing Back after submitting shouldn't reopen the finished form
        router.replace(`/order/confirmation?ref=${order.ref}`);
      }}
    />
  );
}
