import type { Metadata } from "next";
import { LoginForm } from "@/components/staff/LoginForm";

export const metadata: Metadata = { title: "Staff sign in · PrintServeX", robots: { index: false } };

// S1: simple centered card, outside the staff sidebar layout
export default function StaffLoginPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
