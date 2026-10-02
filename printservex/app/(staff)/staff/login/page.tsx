import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/staff/LoginForm";
import { getCurrentStaff } from "@/lib/staff-session";

export const metadata: Metadata = { title: "Staff sign in · PrintServeX", robots: { index: false } };

// S1: simple centered card, outside the staff sidebar layout
export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Already signed in → straight to the portal
  if (await getCurrentStaff()) redirect("/staff/dashboard");
  const { next } = await searchParams;

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <LoginForm next={next} />
    </main>
  );
}
