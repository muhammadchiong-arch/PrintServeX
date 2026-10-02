import type { Metadata } from "next";
import { Dashboard } from "@/components/staff/Dashboard";

export const metadata: Metadata = { title: "Dashboard · PrintServeX Staff" };

// S2
export default function DashboardPage() {
  return <Dashboard />;
}
