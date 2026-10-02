"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type SegmentedControlProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// Two-option switch (e.g. B&W / Color). Built from radio buttons, so arrow keys work.
// The white "thumb" slides behind the selected option.
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  const name = useId();
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div
        className="relative grid h-12 rounded-[10px] border border-border bg-[#f1f4f8] p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-md bg-surface shadow-[0_1px_2px_rgb(15_30_61/0.1),0_2px_8px_rgb(15_30_61/0.06)] transition-transform duration-200 ease-move"
          style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {options.map((o) => (
          <label key={o.value} className="relative flex cursor-pointer items-center justify-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className={cn("transition-colors duration-200", o.value === value ? "font-semibold text-navy" : "text-slate")}>
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
