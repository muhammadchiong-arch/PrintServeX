import type { Metadata } from "next";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Reports } from "@/components/staff/Reports";

export const metadata: Metadata = { title: "Reports · PrintServeX Staff" };

// S10 (admin only)
export default function ReportsPage() {
  return (
    <AdminOnly>
      <Reports />
    </AdminOnly>
  );
}
