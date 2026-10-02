"use client";

import { useState } from "react";
import { CircleAlert, CloudUpload } from "lucide-react";
import { cn } from "@/lib/cn";
import { priceFile, type Prices, type PrintOptions } from "@/lib/price";
import { UPLOAD_RULES } from "@/lib/shop";
import { FileCard } from "./FileCard";
import type { Catalog, OrderFile } from "./types";

type FilesStepProps = {
  files: OrderFile[];
  errors: string[]; // problems with the files the customer just picked
  catalog: Catalog;
  prices: Prices;
  onAddFiles: (files: File[]) => void;
  onChangeFile: (id: string, patch: Partial<PrintOptions>) => void;
  onRemoveFile: (id: string) => void;
};

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";

// Step 2: drag-and-drop upload, then one card of options per file
export function FilesStep({ files, errors, catalog, prices, onAddFiles, onChangeFile, onRemoveFile }: FilesStepProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {/* The whole box is a label for the hidden file input: click/tap opens the file picker */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAddFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface p-5 text-center transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue lg:p-8",
          dragging ? "border-blue bg-blue-tint" : "border-[#b9c6da] hover:border-blue",
        )}
      >
        <input
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            onAddFiles(Array.from(e.target.files ?? []));
            e.target.value = ""; // lets the customer pick the same file again
          }}
        />
        <CloudUpload aria-hidden className="size-6 text-blue lg:size-7" />
        <span className="font-semibold">
          <span className="lg:hidden">Tap to choose files</span>
          <span className="max-lg:hidden">
            Drag files here or <span className="text-blue underline-offset-2 hover:underline">browse</span>
          </span>
        </span>
        <span className="text-xs text-slate lg:text-sm">
          {UPLOAD_RULES.fileTypes.join(", ")} · up to {UPLOAD_RULES.maxFileMb} MB each
          <span className="max-lg:hidden"> · {UPLOAD_RULES.maxFilesPerOrder} files max</span>
        </span>
      </label>

      {/* Error messages: wrong file type, too large, too many files */}
      {errors.map((msg) => (
        <p key={msg} role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint px-3 py-3 text-sm text-cancelled lg:px-4">
          <CircleAlert size={20} aria-hidden className="shrink-0" />
          {msg}
        </p>
      ))}

      {files.map((f) =>
        f.status === "reading" ? (
          // Progress card while the file is being read
          <div key={f.id} className="flex flex-col gap-2 rounded-xl bg-surface px-4 py-3 shadow-card lg:px-6 lg:py-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-semibold">{f.file.name}</span>
              <span className="shrink-0 text-slate">Checking · {f.progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Checking ${f.file.name}`}
              aria-valuenow={f.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-border"
            >
              <div className="h-1.5 w-full origin-left bg-blue transition-transform duration-200 ease-linear" style={{ transform: `scaleX(${f.progress / 100})` }} />
            </div>
          </div>
        ) : (
          <FileCard
            key={f.id}
            item={f}
            catalog={catalog}
            addOns={prices.addOns}
            price={priceFile(prices, f.options)}
            onChange={(patch) => onChangeFile(f.id, patch)}
            onRemove={() => onRemoveFile(f.id)}
          />
        ),
      )}
    </div>
  );
}
