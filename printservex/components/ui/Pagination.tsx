"use client";

import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

const btn = "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors duration-150";

// "Showing 1 to 10 of 23" with Previous / page numbers / Next
export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pages" className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-slate">
      <span>{total === 0 ? "No results" : `Showing ${from} to ${to} of ${total}`}</span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={cn(btn, "border-border bg-surface text-navy hover:bg-bg disabled:bg-bg disabled:text-[#94a3b8]")}>
          Previous
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPage(n)}
            className={cn(btn, n === page ? "border-blue bg-processing-tint font-semibold text-blue-hover" : "border-border bg-surface text-navy hover:bg-bg")}
          >
            {n}
          </button>
        ))}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={cn(btn, "border-border bg-surface text-navy hover:bg-bg disabled:bg-bg disabled:text-[#94a3b8]")}>
          Next
        </button>
      </div>
    </nav>
  );
}
