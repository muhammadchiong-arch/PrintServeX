"use client";

import { useState } from "react";
import { CircleAlert, CloudUpload } from "lucide-react";
import { cn } from "@/lib/cn";
import { priceFile, priceLine, type Prices, type PrintOptions } from "@/lib/price";
import { checkLineDetails, fileTypesText, multiFile, type LineDetails, type Service } from "@/lib/services";
import { UPLOAD_RULES } from "@/lib/shop";
import { FileCard } from "./FileCard";
import { ServiceLineCard } from "./ServiceLineCard";
import { lineInput, type Catalog, type OrderLine } from "./types";

type FilesStepProps = {
  chosen: string[]; // service ids from step 2
  lines: OrderLine[];
  errors: Record<string, string[]>; // per service: problems with the files just picked
  catalog: Catalog;
  prices: Prices;
  showProblems: boolean; // true after the customer tried to continue
  onAddFiles: (serviceId: string, files: File[]) => void;
  onLineFile: (lineId: string, file: File | null) => void;
  onChangeOptions: (lineId: string, patch: Partial<PrintOptions>) => void;
  onChangeDetails: (lineId: string, patch: Partial<LineDetails>) => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveService: (serviceId: string) => void;
};

// Drag-and-drop box for one service. The whole box is a label for the hidden file input.
function DropZone({ service, onFiles }: { service: Service; onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed bg-surface p-4 text-center transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue lg:p-6",
        dragging ? "border-blue bg-blue-tint" : "border-[#b9c6da] hover:border-blue",
      )}
    >
      <input
        type="file"
        multiple
        accept={service.fileTypes.map((t) => `.${t}`).join(",")}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = ""; // lets the customer pick the same file again
        }}
      />
      <CloudUpload aria-hidden className="size-6 text-blue" />
      <span className="font-semibold">
        <span className="lg:hidden">Tap to add files for {service.name}</span>
        <span className="max-lg:hidden">
          Drag files for {service.name} here or <span className="text-blue underline-offset-2 hover:underline">browse</span>
        </span>
      </span>
      <span className="text-xs text-slate lg:text-sm">
        {fileTypesText(service.fileTypes)} · up to {UPLOAD_RULES.maxFileMb} MB each
      </span>
    </label>
  );
}

// Step 3: one section per chosen service, with its files and options
export function FilesStep(props: FilesStepProps) {
  const { chosen, lines, errors, catalog, prices, showProblems } = props;
  const sizeIds = catalog.sizes.map((s) => s.id);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {chosen.map((serviceId) => {
        const service = catalog.services.find((s) => s.id === serviceId);
        if (!service) return null;
        const own = lines.filter((l) => l.serviceId === serviceId);
        const category = catalog.categories.find((c) => c.key === service.categoryKey);
        return (
          <section key={serviceId} aria-labelledby={`svc-${serviceId}`} className="flex flex-col gap-3 lg:gap-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{category?.name}</p>
                <h2 id={`svc-${serviceId}`} className="text-lg lg:text-xl">
                  {service.name}
                </h2>
              </div>
              {multiFile(service) && (
                <button type="button" onClick={() => props.onRemoveService(serviceId)} className="rounded px-1 py-2 text-sm font-semibold text-slate hover:text-cancelled hover:underline">
                  Remove<span className="sr-only"> {service.name}</span>
                </button>
              )}
            </div>

            {multiFile(service) && <DropZone service={service} onFiles={(files) => props.onAddFiles(serviceId, files)} />}

            {(errors[serviceId] ?? []).map((msg) => (
              <p key={msg} role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint px-3 py-3 text-sm text-cancelled lg:px-4">
                <CircleAlert size={20} aria-hidden className="shrink-0" />
                {msg}
              </p>
            ))}

            {multiFile(service) && own.length === 0 && showProblems && (
              <p role="alert" className="text-sm text-cancelled">
                Add at least one file for {service.name}, or remove it.
              </p>
            )}

            {own.map((line) => {
              if (line.status === "reading" && line.file) {
                return (
                  // Progress card while the file is being read
                  <div key={line.id} className="flex flex-col gap-2 rounded-xl bg-surface px-4 py-3 shadow-card lg:px-6 lg:py-4">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{line.file.name}</span>
                      <span className="shrink-0 text-slate">Checking · {line.progress}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`Checking ${line.file.name}`}
                      aria-valuenow={line.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 overflow-hidden rounded-full bg-border"
                    >
                      <div className="h-1.5 w-full origin-left bg-blue transition-transform duration-200 ease-linear" style={{ transform: `scaleX(${line.progress / 100})` }} />
                    </div>
                  </div>
                );
              }
              if (service.kind === "document" && line.file) {
                return (
                  <FileCard
                    key={line.id}
                    item={{ ...line, file: line.file }}
                    catalog={catalog}
                    addOns={prices.addOns}
                    price={priceFile(prices, line.options)}
                    onChange={(patch) => props.onChangeOptions(line.id, patch)}
                    onDetails={(patch) => props.onChangeDetails(line.id, patch)}
                    onRemove={() => props.onRemoveLine(line.id)}
                    showProblem={showProblems}
                  />
                );
              }
              const input = lineInput(line, service);
              return (
                <ServiceLineCard
                  key={line.id}
                  line={line}
                  service={service}
                  catalog={catalog}
                  price={priceLine(prices, input, sizeIds)}
                  addOns={prices.addOns}
                  problem={checkLineDetails(service, line.details, input.hasFile, sizeIds)}
                  showProblem={showProblems}
                  onDetails={(patch) => props.onChangeDetails(line.id, patch)}
                  onFile={(file) => props.onLineFile(line.id, file)}
                  onRemove={() => (multiFile(service) ? props.onRemoveLine(line.id) : props.onRemoveService(serviceId))}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
