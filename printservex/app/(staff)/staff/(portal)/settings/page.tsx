import type { Metadata } from "next";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Settings } from "@/components/staff/Settings";
import { getPaymentSettings } from "@/lib/shop-data";

export const metadata: Metadata = { title: "Settings · PrintServeX Staff" };

// S12 (admin only)
export default async function SettingsPage() {
  const payment = await getPaymentSettings();
  return (
    <AdminOnly>
      <Settings payment={payment} />
    </AdminOnly>
  );
}
