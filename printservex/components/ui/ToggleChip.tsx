"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type ToggleChipProps = {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

// Pill button that turns blue with a check mark when on (used for add-ons)
export function ToggleChip({ pressed, onToggle, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-[background-color,border-color,scale] duration-150 ease-snap active:scale-[0.96]",
        pressed ? "border-blue bg-processing-tint font-semibold text-blue-hover" : "border-border bg-surface text-navy hover:bg-bg",
      )}
    >
      <Check
        size={16}
        aria-hidden
        className={cn("transition-[opacity,margin,scale] duration-200 ease-snap", pressed ? "scale-100 opacity-100" : "-ml-[22px] scale-50 opacity-0")}
      />
      {children}
    </button>
  );
}
