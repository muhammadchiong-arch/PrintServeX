import type { Metadata } from "next";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Settings } from "@/components/staff/Settings";

export const metadata: Metadata = { title: "Settings · PrintServeX Staff" };

// S12 (admin only)
export default function SettingsPage() {
  return (
    <AdminOnly>
      <Settings />
    </AdminOnly>
  );
}
