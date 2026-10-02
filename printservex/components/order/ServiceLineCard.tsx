"use client";

import { useState } from "react";
import { CircleAlert, FileText, ImageIcon, Paperclip, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import { formatFileSize, isImage } from "@/lib/files";
import { formatPeso } from "@/lib/format";
import type { LinePrice } from "@/lib/price";
import { areaSqFt, BACKGROUND_LABELS, fileTypesText, LIMITS, multiFile, type LineDetails, type Service } from "@/lib/services";
import type { Catalog, OrderLine } from "./types";

type ServiceLineCardProps = {
  line: OrderLine;
  service: Service;
  catalog: Catalog;
  price: LinePrice | null; // null = options not complete yet
  problem: string | null; // what's still missing, from checkLineDetails
  showProblem: boolean; // true after the customer tried to continue
  onDetails: (patch: Partial<LineDetails>) => void;
  onFile: (file: File | null) => void; // optional-file services only
  onRemove: () => void;
};

// A number box that keeps what the customer types, and only reports valid numbers
function NumberField({ label, value, onValue, decimals = false, min, max }: { label: string; value: number | undefined; onValue: (n: number | undefined) => void; decimals?: boolean; min: number; max: number }) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  return (
    <Input
      label={label}
      type="number"
      inputMode={decimals ? "decimal" : "numeric"}
      min={min}
      max={max}
      step={decimals ? "0.1" : "1"}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        const ok = e.target.value !== "" && Number.isFinite(n) && (decimals || Number.isInteger(n));
        onValue(ok ? n : undefined);
      }}
    />
  );
}

/**
 * Options for one line of a non-document service (binding, photos, design, large format,
 * customized, school & business). Shows only the options that apply to that kind.
 */
export function ServiceLineCard({ line, service, catalog, price, problem, showProblem, onDetails, onFile, onRemove }: ServiceLineCardProps) {
  const d = line.details;
  const sizeOptions = catalog.sizes.map((s) => ({ value: s.id, label: s.name }));
  const accept = service.fileTypes.map((t) => `.${t}`).join(",");
  const typesText = fileTypesText(service.fileTypes);
  const fileFirst = multiFile(service); // the file IS the line (photo, large format)
  const needsFile = service.kind === "design" ? d.mode === "file" : service.fileRule === "required";
  const area = service.kind === "large_format" ? areaSqFt(d) : null;
  const Icon = line.file && isImage(line.file.name) ? ImageIcon : FileText;

  const quantity = (label = "Quantity") => (
    <NumberField label={label} value={d.quantity} min={1} max={LIMITS.quantity} onValue={(quantity) => onDetails({ quantity })} />
  );

  return (
    <article aria-label={line.file?.name ?? service.name} className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card lg:gap-5 lg:p-6">
      <div className="flex items-center gap-3 lg:gap-4">
        {line.file && (
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded border border-border bg-[repeating-linear-gradient(135deg,#f1f4f8_0_6px,#e6ebf2_6px_12px)] text-slate lg:h-[60px] lg:w-12">
            <Icon size={18} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold lg:text-base">{fileFirst && line.file ? line.file.name : service.name}</p>
          <p className="text-xs text-slate lg:text-sm">
            {fileFirst && line.file ? formatFileSize(line.file.size) : service.unitPrice !== null ? `${formatPeso(service.unitPrice)} ${service.unitLabel}` : "Price confirmed by staff"}
          </p>
        </div>
        <span className="tabular shrink-0 text-right font-heading text-base font-semibold lg:text-lg">
          {price?.status === "priced" ? formatPeso(price.total) : price?.status === "quote" ? <span className="font-sans text-xs font-medium text-slate">To be confirmed</span> : "—"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={fileFirst && line.file ? `Remove ${line.file.name}` : `Remove ${service.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate transition-colors duration-150 hover:bg-cancelled-tint hover:text-cancelled"
        >
          <Trash2 size={20} aria-hidden />
        </button>
      </div>

      {service.kind === "design" && (
        <SegmentedControl
          label="How should we do it?"
          value={d.mode ?? "design"}
          onChange={(mode) => onDetails({ mode })}
          options={[
            { value: "design", label: "Design it for me" },
            { value: "file", label: "I have a file" },
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {(service.kind === "finishing" || service.kind === "school_business") && (
          <Select label="Paper size" value={d.sizeId ?? ""} onChange={(e) => onDetails({ sizeId: e.target.value })} options={sizeOptions} />
        )}
        {service.kind === "school_business" && (
          <SegmentedControl
            label="Print"
            value={d.color ? "color" : "bw"}
            onChange={(v) => onDetails({ color: v === "color" })}
            options={[
              { value: "bw", label: "B&W" },
              { value: "color", label: "Color" },
            ]}
          />
        )}
        {service.kind === "photo" && (
          <div className="col-span-2">
            <SegmentedControl
              label="Background"
              value={d.background ?? "as_is"}
              onChange={(background) => onDetails({ background })}
              options={[
                { value: "as_is", label: "As is" },
                { value: "white", label: "White" },
                { value: "blue", label: "Blue" },
              ]}
            />
          </div>
        )}
        {(service.kind === "design" || service.kind === "custom") && (
          <Input label="Size (optional)" value={d.sizeText ?? ""} maxLength={LIMITS.sizeText} placeholder="e.g. 5 × 7 in" onChange={(e) => onDetails({ sizeText: e.target.value })} />
        )}
        {service.kind === "large_format" && (
          <>
            <NumberField label={`Width (${d.unit ?? "ft"})`} value={d.width} decimals min={LIMITS[d.unit ?? "ft"].min} max={LIMITS[d.unit ?? "ft"].max} onValue={(width) => onDetails({ width })} />
            <NumberField label={`Height (${d.unit ?? "ft"})`} value={d.height} decimals min={LIMITS[d.unit ?? "ft"].min} max={LIMITS[d.unit ?? "ft"].max} onValue={(height) => onDetails({ height })} />
            <SegmentedControl
              label="Unit"
              value={d.unit ?? "ft"}
              onChange={(unit) => onDetails({ unit })}
              options={[
                { value: "ft", label: "ft" },
                { value: "cm", label: "cm" },
              ]}
            />
          </>
        )}
        {quantity(service.kind === "photo" ? `Quantity (${service.unitLabel.replace("per ", "")}s)` : "Quantity")}
      </div>

      {area !== null && (
        <p className="-mt-2 text-xs text-slate">
          {area} sq ft each{d.quantity && d.quantity > 1 ? ` · ${Math.round(area * d.quantity * 100) / 100} sq ft in total` : ""}
        </p>
      )}

      <Textarea
        label={
          service.kind === "design" && d.mode !== "file"
            ? "What should we design?"
            : service.kind === "large_format"
              ? "Material and finish (optional)"
              : service.kind === "custom"
                ? "Customization instructions (optional)"
                : "Notes for the shop (optional)"
        }
        value={d.notes ?? ""}
        maxLength={LIMITS.notes}
        placeholder={
          service.kind === "design" && d.mode !== "file"
            ? "Text to include, colors, sizes, any examples you like"
            : service.kind === "large_format"
              ? "e.g. Matte tarpaulin with eyelets"
              : service.kind === "finishing"
                ? "e.g. Blue cover, bind chapters 1 to 3 together"
                : "Anything staff should know"
        }
        onChange={(e) => onDetails({ notes: e.target.value })}
      />

      {/* Optional file (one per service). Photo / large format lines always come from a file. */}
      {!fileFirst &&
        (line.file ? (
          <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <Icon size={18} aria-hidden className="shrink-0 text-slate" />
            <span className="min-w-0 flex-1 truncate font-medium">{line.file.name}</span>
            <span className="shrink-0 text-slate">{formatFileSize(line.file.size)}</span>
            <button type="button" onClick={() => onFile(null)} aria-label={`Remove ${line.file.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate hover:bg-cancelled-tint hover:text-cancelled">
              <X size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed px-3 py-2 text-sm font-semibold text-blue transition-colors duration-150 hover:bg-blue-tint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue",
              needsFile && showProblem ? "border-cancelled" : "border-[#b9c6da]",
            )}
          >
            <input
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(e) => {
                onFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Paperclip size={16} aria-hidden />
            {needsFile ? "Upload your file" : "Attach a file (optional)"}
            <span className="font-normal text-slate">· {typesText}</span>
          </label>
        ))}

      {problem && showProblem && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <CircleAlert size={20} aria-hidden className="shrink-0" />
          {problem}
        </p>
      )}
      {price?.status === "quote" && (
        <p className="text-xs text-slate">Staff will confirm the price for this after checking your order. It isn&apos;t in the estimate yet.</p>
      )}
      {service.kind === "photo" && d.background && d.background !== "as_is" && (
        <p className="-mt-2 text-xs text-slate">{BACKGROUND_LABELS[d.background]}: staff will change it before printing.</p>
      )}
    </article>
  );
}
