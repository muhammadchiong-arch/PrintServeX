"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, controlClasses } from "./Field";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  size?: "lg" | "md";
};

// A native <select> (works with keyboard and phone pickers) styled to match the design
export function Select({ label, options, hint, error, size = "lg", id, required, className, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field id={selectId} label={label} required={required} hint={hint} error={error}>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${selectId}-msg` : undefined}
          className={cn(controlClasses(size, Boolean(error)), "appearance-none pr-10", className)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate"
        />
      </div>
    </Field>
  );
}
