"use client";

import { useState } from "react";
import {
  BookOpen,
  Briefcase,
  Camera,
  Check,
  FileText,
  Gift,
  Maximize2,
  PenTool,
  Plus,
  Printer,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Service } from "@/lib/services";
import { UPLOAD_RULES } from "@/lib/shop";
import { servicePriceText, type Catalog } from "./types";

// Icon names saved in service_categories.icon
const ICONS: Record<string, LucideIcon> = {
  "file-text": FileText,
  "book-open": BookOpen,
  camera: Camera,
  "pen-tool": PenTool,
  maximize: Maximize2,
  gift: Gift,
  briefcase: Briefcase,
};

type ServiceStepProps = {
  catalog: Catalog;
  chosen: string[]; // service ids, in the order they were added
  minPagePrice: number | null; // cheapest per-page price, for "From ₱2.00 per page"
  full: boolean; // the order already has the most lines allowed
  onAdd: (service: Service) => void;
  onRemove: (serviceId: string) => void;
};

/**
 * Step 2: what do you need? Category tiles → that category's services → Add.
 * Customers can add services from several categories (e.g. Thesis + Spiral Binding + 2×2 ID Photo).
 */
export function ServiceStep({ catalog, chosen, minPagePrice, full, onAdd, onRemove }: ServiceStepProps) {
  // Open the category of the first chosen service, or the first category
  const firstChosen = catalog.services.find((s) => s.id === chosen[0]);
  const [categoryKey, setCategoryKey] = useState(firstChosen?.categoryKey ?? catalog.categories[0]?.key ?? "");
  const category = catalog.categories.find((c) => c.key === categoryKey);
  const services = catalog.services.filter((s) => s.categoryKey === categoryKey);
  const chosenServices = chosen.flatMap((id) => catalog.services.filter((s) => s.id === id));

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <p className="text-sm text-slate lg:text-base">Choose a category, then add what you need. You can add services from more than one category.</p>

      {/* Categories: a radio group, so arrow keys move between tiles */}
      <fieldset>
        <legend className="sr-only">Service category</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
          {catalog.categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Printer;
            const selected = c.key === categoryKey;
            const count = chosenServices.filter((s) => s.categoryKey === c.key).length;
            return (
              <label
                key={c.key}
                className={cn(
                  "relative flex min-h-[108px] cursor-pointer flex-col gap-2 rounded-xl border bg-surface p-3 transition-[border-color,background-color,box-shadow] duration-150 ease-snap has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue lg:p-4",
                  selected ? "border-blue bg-blue-tint shadow-[inset_0_0_0_1px_var(--blue)]" : "border-border hover:border-[#b9c6da]",
                )}
              >
                <input type="radio" name="service-category" value={c.key} checked={selected} onChange={() => setCategoryKey(c.key)} className="sr-only" />
                <span className={cn("flex size-9 items-center justify-center rounded-lg", selected ? "bg-blue text-white" : "bg-processing-tint text-blue")}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-tight">{c.name}</span>
                <span className="text-xs leading-snug text-slate max-sm:hidden">{c.description}</span>
                {count > 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-blue px-2 py-0.5 text-[11px] font-semibold text-white">
                    {count}
                    <span className="sr-only"> added</span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {category && (
        <section aria-labelledby="services-title" className="overflow-hidden rounded-xl bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3 lg:px-6">
            <h2 id="services-title" className="text-base lg:text-lg">
              {category.name}
            </h2>
            <p className="text-xs text-slate lg:text-sm">{category.description}</p>
          </div>
          {services.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate">Nothing offered here right now.</p>
          ) : (
            <ul>
              {services.map((s) => {
                const added = chosen.includes(s.id);
                return (
                  <li key={s.id} className="flex min-h-14 items-center gap-3 border-t border-border px-4 py-2 first:border-t-0 lg:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-slate">{servicePriceText(s, minPagePrice, catalog.photoSizes)}</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={added}
                      disabled={!added && full}
                      onClick={() => (added ? onRemove(s.id) : onAdd(s))}
                      className={cn(
                        "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,scale] duration-150 ease-snap active:scale-[0.96] disabled:cursor-not-allowed disabled:border-border disabled:bg-bg disabled:text-slate disabled:active:scale-100",
                        added ? "border-blue bg-processing-tint text-blue-hover" : "border-border bg-surface text-navy hover:bg-bg",
                      )}
                    >
                      {added ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                      {added ? "Added" : "Add"}
                      <span className="sr-only"> {s.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* What's in the order so far */}
      <section aria-labelledby="chosen-title" className="rounded-xl bg-surface px-4 py-3 shadow-card lg:px-6 lg:py-4">
        <h2 id="chosen-title" className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-slate">
          Your services · {chosenServices.length}
        </h2>
        {chosenServices.length === 0 ? (
          <p className="mt-1 text-sm text-slate">Nothing added yet. Pick a category above and tap Add.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {chosenServices.map((s) => (
              <li key={s.id} className="flex h-9 items-center gap-1 rounded-full bg-bg pl-3 pr-1 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-slate max-sm:hidden">· {catalog.categories.find((c) => c.key === s.categoryKey)?.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  aria-label={`Remove ${s.name}`}
                  className="flex size-8 items-center justify-center rounded-full text-slate transition-colors duration-150 hover:bg-cancelled-tint hover:text-cancelled"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {full && <p className="mt-2 text-xs text-slate">An order can have up to {UPLOAD_RULES.maxFilesPerOrder} items. Send another order for more.</p>}
      </section>
    </div>
  );
}
