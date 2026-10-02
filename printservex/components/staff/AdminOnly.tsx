"use client";

import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStaff } from "./StaffStore";

// Business rule: Pricing, Reports, Users and Settings are for the Admin (shop owner) only
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useStaff();
  if (isAdmin) return children;
  return (
    <div className="rounded-xl bg-surface shadow-card">
      <EmptyState icon={ShieldAlert} title="Admin only" text="Only the shop owner can open this page. Ask them if you need a change here." />
    </div>
  );
}
