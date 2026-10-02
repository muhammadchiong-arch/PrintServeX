import type { Metadata } from "next";
import { ItemDetail } from "@/components/staff/inventory/ItemDetail";

export const metadata: Metadata = { title: "Item detail · PrintServeX Staff" };

type Props = { params: Promise<{ id: string }> };

// S8: /staff/inventory/bond-a4-80
export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  return <ItemDetail itemId={id} />;
}
