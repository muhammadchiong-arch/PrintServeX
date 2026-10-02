import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { STEPS } from "./types";

type OrderHeaderProps = {
  step: number;
  onBack: () => void;
};

const iconBtn = "flex size-11 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-bg active:bg-bg";

// Phones: back/close button, step title, "Step 2 of 3" and a progress bar.
// Desktop: logo on the left, the 3-step stepper on the right.
export function OrderHeader({ step, onBack }: OrderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      {/* Phone header */}
      <div className="lg:hidden">
        <div className="flex h-14 items-center gap-1 px-2">
          {step === 0 ? (
            <Link href="/" aria-label="Close and go back to the home page" className={iconBtn}>
              <X size={24} aria-hidden />
            </Link>
          ) : (
            <button type="button" onClick={onBack} aria-label="Back to the previous step" className={iconBtn}>
              <ArrowLeft size={24} aria-hidden />
            </button>
          )}
          <span className="font-heading text-base font-semibold">{STEPS[step]}</span>
          <span className="ml-auto pr-3 text-sm text-slate">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-1 bg-border">
          <div
            className="h-1 w-full origin-left bg-blue transition-transform duration-250 ease-move"
            style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }}
          />
        </div>
      </div>

      {/* Desktop header */}
      <div className="mx-auto hidden h-[72px] max-w-[1280px] items-center justify-between gap-8 px-8 lg:flex">
        <Link href="/" aria-label="PrintServeX home" className="shrink-0 rounded-lg">
          <Image src="/logo-horizontal-color.png" alt="PrintServeX" width={2400} height={698} priority className="h-11 w-auto" />
        </Link>
        <Stepper steps={[...STEPS]} current={step} className="w-[560px]" />
      </div>
    </header>
  );
}
