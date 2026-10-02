import { OrdersSkeleton } from "@/components/staff/OrdersList";

// Shown by Next.js while the Orders page loads
export default function OrdersLoading() {
  return <OrdersSkeleton />;
}
