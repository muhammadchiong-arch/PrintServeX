import type { Metadata } from "next";
import { AdminOnly } from "@/components/staff/AdminOnly";
import { Users } from "@/components/staff/Users";

export const metadata: Metadata = { title: "Users · PrintServeX Staff" };

// S11 (admin only)
export default function UsersPage() {
  return (
    <AdminOnly>
      <Users />
    </AdminOnly>
  );
}
