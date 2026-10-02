import { Button } from "@/components/ui/Button";
import { formatPeso } from "@/lib/format";
import { priceFile, type OrderPrice, type Prices } from "@/lib/price";
import type { OrderFile } from "./types";

export type SummaryAction = {
  label: string;
  onClick: () => void;
  disabled: boolean;
  hint?: string; // why the button is disabled
};

type PriceSummaryProps = {
  files: OrderFile[];
  totals: OrderPrice;
  prices: Prices;
  primary: SummaryAction;
  back?: { label: string; onClick: () => void };
  compact?: boolean; // staff walk-in: smaller buttons, always visible
};

const row = "flex justify-between gap-3 text-sm";

// Desktop: price card on the right that stays in view while scrolling
export function PriceSummary({ files, totals, prices, primary, back, compact = false }: PriceSummaryProps) {
  const size = compact ? "md" : "lg";
  return (
    <aside
      aria-label="Price summary"
      className={
        compact
          ? "sticky top-[84px] flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-card"
          : "sticky top-24 flex flex-col gap-3 rounded-xl bg-surface p-6 shadow-card max-lg:hidden lg:mt-[52px]"
      }
    >
      <h2 className="text-lg">Price summary</h2>

      {files.length === 0 && <p className="text-sm text-slate">No files yet. You&apos;ll add them in the next step.</p>}

      {files.map((f) => {
        const p = f.status === "ready" ? priceFile(prices, f.options) : null;
        return (
          <div key={f.id} className="flex flex-col gap-1">
            <div className={row}>
              <span className="truncate text-slate">{f.file.name}</span>
              <span className="tabular shrink-0">
                {f.status === "reading" ? <span className="text-slate">Checking…</span> : p ? formatPeso(p.printing) : "Not available"}
              </span>
            </div>
            {p && (
              <>
                <span className="text-xs text-slate">
                  {f.options.pages} pp × {f.options.copies} × {formatPeso(p.rate)}
                </span>
                {p.binding > 0 && (
                  <div className={row}>
                    <span className="text-slate">Binding</span>
                    <span className="tabular">{formatPeso(p.binding)}</span>
                  </div>
                )}
                {p.lamination > 0 && (
                  <div className={row}>
                    <span className="text-slate">Lamination</span>
                    <span className="tabular">{formatPeso(p.lamination)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-semibold">Estimated total</span>
        <span className="tabular font-heading text-2xl font-semibold" aria-live="polite">
          {formatPeso(totals.total)}
        </span>
      </div>
      <p className="text-xs text-slate">{compact ? "Estimate. Confirm the final price after checking the files." : "Staff confirm the final price. You pay at pickup."}</p>

      <Button size={size} onClick={primary.onClick} disabled={primary.disabled} className="active:scale-[0.97]">
        {primary.label}
      </Button>
      {primary.disabled && primary.hint && <p className="-mt-1 text-center text-xs text-slate">{primary.hint}</p>}
      {back && (
        <Button size={size} variant={compact ? "secondary" : "ghost"} onClick={back.onClick}>
          {back.label}
        </Button>
      )}
    </aside>
  );
}

type MobileOrderBarProps = {
  fileCount: number;
  totals: OrderPrice;
  primary: SummaryAction;
  showTotal: boolean;
};

// Phones: frosted bar stuck to the bottom with the live total and the main button
export function MobileOrderBar({ fileCount, totals, primary, showTotal }: MobileOrderBarProps) {
  return (
    <div
      data-material
      className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/5 bg-surface/80 px-4 pb-6 pt-3 shadow-[0_-4px_16px_rgb(15_30_61/0.06)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <div className={showTotal ? "flex items-center gap-3" : "flex flex-col gap-2"}>
        {showTotal && (
          <div className="flex-1">
            <p className="text-xs text-slate">
              Estimated total · {fileCount} {fileCount === 1 ? "file" : "files"}
            </p>
            <p className="tabular font-heading text-xl font-semibold tracking-[-0.01em]" aria-live="polite">
              {formatPeso(totals.total)}
            </p>
          </div>
        )}
        <Button onClick={primary.onClick} disabled={primary.disabled} className="active:scale-[0.97]">
          {primary.label}
        </Button>
        {!showTotal && primary.disabled && primary.hint && <p className="text-center text-xs text-slate">{primary.hint}</p>}
      </div>
      {showTotal && primary.disabled && primary.hint && <p className="mt-2 text-center text-xs text-slate">{primary.hint}</p>}
    </div>
  );
}
