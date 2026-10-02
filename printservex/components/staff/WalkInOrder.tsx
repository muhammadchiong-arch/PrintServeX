"use client";

import { useRouter } from "next/navigation";
import { OrderWizard } from "@/components/order/OrderWizard";
import { useToast } from "@/components/ui/Toast";
import type { PriceRule } from "@/lib/price";
import type { Catalog } from "@/components/order/types";
import { useStaff } from "./StaffStore";

// S5: the same 3 steps as the customer form (C2), inside the staff layout.
// On "Create order" the order is added to the Orders list and its detail page opens.
export function WalkInOrder(props: Catalog & { rules: PriceRule[] }) {
  const { addWalkInOrder } = useStaff();
  const router = useRouter();
  const toast = useToast();

  return (
    <OrderWizard
      {...props}
      variant="staff"
      onSubmit={(draft) => {
        const ref = addWalkInOrder(draft);
        toast({ message: `Walk-in order ${ref} created.` });
        router.replace(`/staff/orders/${ref}`);
      }}
    />
  );
}
