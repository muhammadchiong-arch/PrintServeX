"use client";

import { useState } from "react";
import { CircleAlert, FileText, ImageIcon, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { formatFileSize, isImage } from "@/lib/files";
import { formatPeso } from "@/lib/format";
import type { AddOns, FilePrice, PrintOptions } from "@/lib/price";
import type { LineDetails } from "@/lib/services";
import type { Catalog, OrderLine } from "./types";

type FileCardProps = {
  item: OrderLine & { file: File }; // a Document Printing line always has a file
  price: FilePrice | null; // null = this combination isn't offered
  addOns: AddOns; // null = not offered right now
  catalog: Catalog;
  onChange: (patch: Partial<PrintOptions>) => void;
  onDetails: (patch: Partial<LineDetails>) => void;
  onRemove: () => void;
};

const MAX_PAGES = 2000;

// One uploaded document with all its print options
export function FileCard({ item, price, addOns, catalog, onChange, onDetails, onRemove }: FileCardProps) {
  const o = item.options;
  const Icon = isImage(item.file.name) ? ImageIcon : FileText;
  // The Pages box keeps its own text so the customer can clear it and type a new number
  const [pagesInput, setPagesInput] = useState(String(o.pages));
  const pagesValid = /^\d+$/.test(pagesInput) && Number(pagesInput) >= 1 && Number(pagesInput) <= MAX_PAGES;
  const pagesText = item.pagesDetected ? `${item.pagesDetected} ${item.pagesDetected === 1 ? "page" : "pages"}` : "Pages not counted";

  return (
    <article aria-label={item.file.name} className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card lg:gap-5 lg:p-6">
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Striped placeholder until real previews are added */}
        <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded border border-border bg-[repeating-linear-gradient(135deg,#f1f4f8_0_6px,#e6ebf2_6px_12px)] text-slate lg:h-[60px] lg:w-12">
          <Icon size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold lg:text-base">{item.file.name}</p>
          <p className="text-xs text-slate lg:text-sm">
            {pagesText} · {formatFileSize(item.file.size)}
          </p>
        </div>
        <span className="tabular font-heading text-lg font-semibold max-lg:hidden">{price ? formatPeso(price.total) : "—"}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.file.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate transition-colors duration-150 hover:bg-cancelled-tint hover:text-cancelled"
        >
          <Trash2 size={20} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,1fr)]">
        <Select
          label="Paper size"
          value={o.sizeId}
          onChange={(e) => onChange({ sizeId: e.target.value })}
          options={catalog.sizes.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          label="Paper type"
          value={o.typeId}
          onChange={(e) => onChange({ typeId: e.target.value })}
          options={catalog.types.map((t) => ({ value: t.id, label: t.name }))}
        />
        <div className="col-span-2 lg:col-span-1">
          <SegmentedControl
            label="Print"
            value={o.color ? "color" : "bw"}
            onChange={(v) => onChange({ color: v === "color" })}
            options={[
              { value: "bw", label: "B&W" },
              { value: "color", label: "Color" },
            ]}
          />
        </div>
        <Input
          label="Pages"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_PAGES}
          value={pagesInput}
          onChange={(e) => {
            setPagesInput(e.target.value);
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= MAX_PAGES) onChange({ pages: n });
          }}
          onBlur={() => setPagesInput(String(o.pages))}
          error={pagesValid ? undefined : `Enter 1 to ${MAX_PAGES}.`}
          hint={item.pagesDetected ? undefined : "Type the page count."}
        />
        <NumberStepper label="Copies" value={o.copies} onChange={(copies) => onChange({ copies })} />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="w-[220px] max-w-full">
          <SegmentedControl
            label="Sides"
            value={item.details.sides ?? "single"}
            onChange={(sides) => onDetails({ sides })}
            options={[
              { value: "single", label: "Single" },
              { value: "double", label: "Double" },
            ]}
          />
        </div>
      {(addOns.binding || addOns.lamination) && (
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <span className="mr-1 text-sm font-medium max-lg:sr-only">Add-ons</span>
          {addOns.binding && (
            <ToggleChip pressed={o.binding} onToggle={() => onChange({ binding: !o.binding })}>
              {addOns.binding.label} +{formatPeso(addOns.binding.price)}
            </ToggleChip>
          )}
          {addOns.lamination && (
            <ToggleChip pressed={o.lamination} onToggle={() => onChange({ lamination: !o.lamination })}>
              {addOns.lamination.label} +{formatPeso(addOns.lamination.price)}/sheet
            </ToggleChip>
          )}
        </div>
      )}
      </div>

      {/* An add-on the shop stopped offering while this form was open */}
      {((o.binding && !addOns.binding) || (o.lamination && !addOns.lamination)) && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <CircleAlert size={20} aria-hidden className="shrink-0" />
          An add-on you picked is no longer offered.
          <button type="button" className="font-semibold underline" onClick={() => onChange({ binding: o.binding && Boolean(addOns.binding), lamination: o.lamination && Boolean(addOns.lamination) })}>
            Remove it
          </button>
        </p>
      )}

      {!price && !((o.binding && !addOns.binding) || (o.lamination && !addOns.lamination)) && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <CircleAlert size={20} aria-hidden className="shrink-0" />
          We don&apos;t offer this size, paper and color together. Choose another paper type or size.
        </p>
      )}
    </article>
  );
}
