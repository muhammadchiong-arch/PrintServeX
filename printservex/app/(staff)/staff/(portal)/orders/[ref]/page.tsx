import type { Metadata } from "next";
import { OrderDetail } from "@/components/staff/order-detail/OrderDetail";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params;
  return { title: `${ref} · PrintServeX Staff` };
}

// S4: /staff/orders/PSX-20261001-0042
export default async function OrderDetailPage({ params }: Props) {
  const { ref } = await params;
  return <OrderDetail orderRef={decodeURIComponent(ref)} />;
}
