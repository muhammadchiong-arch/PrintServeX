"use client";

import { cn } from "@/lib/cn";

type Tab<T extends string> = { value: T; label: string; count?: number };

type TabsProps<T extends string> = {
  label: string; // for screen readers, e.g. "Order status"
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  // underline: tabs on top of a card (Orders, Pricing, Settings) · segmented: small switch (Reports)
  variant?: "underline" | "segmented";
  bordered?: boolean; // underline tabs draw their own bottom line unless the parent already has one
  className?: string;
};

export function Tabs<T extends string>({ label, tabs, value, onChange, variant = "underline", bordered = true, className }: TabsProps<T>) {
  const segmented = variant === "segmented";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        segmented ? "inline-flex gap-1 rounded-lg border border-border bg-bg p-1" : cn("flex gap-1 overflow-x-auto px-4", bordered && "border-b border-border"),
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-sm transition-colors duration-150",
              segmented
                ? cn("h-7 rounded-md px-3.5", active ? "bg-surface font-semibold text-navy shadow-sm" : "text-slate hover:text-navy")
                : cn("h-11 px-3", active ? "font-semibold text-navy shadow-[inset_0_-2px_0_var(--blue)]" : "text-slate hover:text-navy"),
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-[#f1f4f8] px-1.5 text-xs font-semibold leading-[18px] text-slate">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
