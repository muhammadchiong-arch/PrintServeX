"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

// − 2 + control for copies. Buttons are 48px wide for easy tapping.
export function NumberStepper({ label, value, onChange, min = 1, max = 99 }: NumberStepperProps) {
  const labelId = useId();
  const btn =
    "flex h-full w-12 items-center justify-center transition-[scale,background-color] duration-150 ease-snap active:scale-[0.95] disabled:text-[#cbd5e1] disabled:active:scale-100";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id={labelId}>
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex h-12 items-center justify-between overflow-hidden rounded-lg border border-border bg-surface">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={`${btn} text-slate active:bg-[#f1f4f8]`}>
          <Minus size={18} aria-hidden />
        </button>
        <output aria-live="polite" className="tabular font-semibold">
          {value}
        </output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={`${btn} text-blue active:bg-blue-tint`}>
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
