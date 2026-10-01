import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type StepperProps = {
  steps: string[];
  // 0-based index of the step the user is on
  current: number;
  className?: string;
};

// Done steps show a check, the current step is outlined blue, later steps are gray
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center gap-3", className)} aria-label="Order steps">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <li aria-hidden className={cn("h-0.5 flex-1 transition-colors duration-300", i <= current ? "bg-blue" : "bg-border")} />
            )}
            <li className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300",
                  done && "bg-blue text-white",
                  active && "border-2 border-blue text-blue",
                  !done && !active && "border-2 border-border text-slate",
                )}
              >
                {done ? <Check size={16} aria-hidden strokeWidth={2.5} /> : i + 1}
              </span>
              {/* Labels hide on very small screens for later steps to save space */}
              <span
                className={cn(
                  "text-sm",
                  active ? "font-semibold text-navy" : done ? "font-medium text-navy" : "text-slate",
                  !active && "max-sm:sr-only",
                )}
              >
                {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
