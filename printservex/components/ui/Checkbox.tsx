"use client";

import { useId } from "react";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode; // the label text
  error?: string;
  className?: string;
};

// A real <input type="checkbox"> (keyboard + screen readers) drawn as a 24px box
export function Checkbox({ checked, onChange, children, error, className }: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface p-3 text-sm",
          error ? "border-cancelled" : "border-border",
        )}
      >
        <span className="relative mt-[-2px] flex size-6 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-msg` : undefined}
            className="peer size-6 cursor-pointer appearance-none rounded border-2 border-slate bg-surface transition-colors duration-150 checked:border-blue checked:bg-blue"
          />
          <Check
            size={16}
            strokeWidth={3}
            aria-hidden
            className="pointer-events-none absolute left-1 top-1 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          />
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-msg`} className="flex items-center gap-1 text-xs text-cancelled">
          <CircleAlert size={14} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
