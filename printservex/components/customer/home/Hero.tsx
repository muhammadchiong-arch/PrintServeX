import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/customer/Container";
import { InkStrip } from "@/components/customer/InkStrip";
import { ClaimStubArt } from "./ClaimStubArt";

export function Hero() {
  return (
    <section className="bg-surface">
      <Container className="grid items-center gap-16 py-8 sm:py-16 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col gap-4 lg:gap-6">
          <InkStrip size="lg" />
          <h1 className="text-3xl tracking-[-0.02em] lg:max-w-[560px] lg:text-5xl lg:leading-[56px] lg:tracking-[-0.025em]">
            Print from your phone,<br className="max-lg:hidden" /> pick up when it&apos;s ready.
          </h1>
          <p className="text-base text-pretty text-slate lg:max-w-[480px] lg:text-lg">
            Upload your files, see the price right away, and pay when you pick up. No account needed.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
            <Link href="/order" className={buttonClasses("primary", "lg", "sm:px-6")}>
              Place an order
              <ArrowRight size={20} aria-hidden />
            </Link>
            <Link href="/track" className={buttonClasses("secondary", "lg", "sm:px-6")}>
              Track an order
            </Link>
          </div>
        </div>
        <ClaimStubArt />
      </Container>
    </section>
  );
}
