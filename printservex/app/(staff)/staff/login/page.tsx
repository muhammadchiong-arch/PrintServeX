import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex w-[400px] max-w-full flex-col gap-2">
        {/* A way out for customers who opened this page by mistake */}
        <Link
          href="/"
          className="-ml-2 flex h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-slate transition-[color,background-color,scale] duration-150 ease-snap hover:bg-surface hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue active:scale-[0.97] motion-reduce:active:scale-100"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to PrintServeX
        </Link>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
