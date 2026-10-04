import { Button } from "@/components/ui/Button";
import { formatPeso } from "@/lib/format";
import { priceLine, type OrderPrice, type Prices } from "@/lib/price";
import { lineInput, type Catalog, type OrderLine } from "./types";

export type SummaryAction = {
  label: string;
  onClick: () => void;
  disabled: boolean;
  hint?: string; // why the button is disabled
};

type PriceSummaryProps = {
  chosen: string[];
  lines: OrderLine[];
  catalog: Catalog;
  totals: OrderPrice;
  prices: Prices;
  primary: SummaryAction;
  back?: { label: string; onClick: () => void };
  compact?: boolean; // staff walk-in: smaller buttons, always visible
};

const row = "flex justify-between gap-3 text-sm";

// "2 items priced by staff" under the total
export function quoteNote(count: number): string | null {
  return count > 0 ? `+ ${count} ${count === 1 ? "item" : "items"} priced by staff` : null;
}

// Desktop: price card on the right that stays in view while scrolling
export function PriceSummary({ chosen, lines, catalog, totals, prices, primary, back, compact = false }: PriceSummaryProps) {
  const size = compact ? "md" : "lg";
  const sizeIds = catalog.sizes.map((s) => s.id);
  const note = quoteNote(totals.quoteCount);

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

      {chosen.length === 0 && <p className="text-sm text-slate">Nothing added yet. Choose a service first.</p>}

      {chosen.map((serviceId) => {
        const service = catalog.services.find((s) => s.id === serviceId);
        if (!service) return null;
        const own = lines.filter((l) => l.serviceId === serviceId);
        return (
          <div key={serviceId} className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold">{service.name}</p>
            {own.length === 0 && <p className="text-xs text-slate">No files yet</p>}
            {own.map((l) => {
              if (l.status === "reading") {
                return (
                  <div key={l.id} className={row}>
                    <span className="truncate text-slate">{l.file?.name}</span>
                    <span className="shrink-0 text-slate">Checking…</span>
                  </div>
                );
              }
              const p = priceLine(prices, lineInput(l, service), sizeIds);
              const label = service.kind === "document" || service.kind === "photo" || service.kind === "large_format" ? (l.file?.name ?? service.name) : `Quantity ${l.details.quantity ?? "—"}`;
              return (
                <div key={l.id} className="flex flex-col gap-0.5">
                  <div className={row}>
                    <span className="truncate text-slate">{label}</span>
                    <span className="tabular shrink-0">
                      {p?.status === "priced" ? formatPeso(p.total) : p?.status === "quote" ? <span className="text-xs text-slate">To be confirmed</span> : <span className="text-xs text-cancelled">Needs options</span>}
                    </span>
                  </div>
                  {p?.status === "priced" && p.file && (
                    <span className="text-xs text-slate">
                      {l.options.pages} pp × {l.options.copies} × {formatPeso(p.file.rate)}
                      {p.file.binding > 0 && ` · binding ${formatPeso(p.file.binding)}`}
                      {p.file.lamination > 0 &&
                        p.file.laminationRate !== null &&
                        ` · lamination ${p.file.laminationSheets} × ${formatPeso(p.file.laminationRate)} = ${formatPeso(p.file.lamination)}`}
                    </span>
                  )}
                  {p?.status === "priced" && !p.file && service.unitPrice !== null && (
                    <span className="text-xs text-slate">
                      {formatPeso(service.unitPrice)} {service.unitLabel} × {l.details.quantity}
                    </span>
                  )}
                  {/* Photo & ID lamination (also counted when the photo itself is priced by staff) */}
                  {p && (p.status === "quote" || !p.file) && p.lamination && (
                    <span className="text-xs text-slate">
                      lamination {p.lamination.quantity} × {formatPeso(p.lamination.rate)} = {formatPeso(p.lamination.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-semibold">Estimated total</span>
        <span className="tabular font-heading text-2xl font-semibold" aria-live="polite">
          {formatPeso(totals.total)}
        </span>
      </div>
      {note && <p className="-mt-2 text-right text-xs font-medium text-slate">{note}</p>}
      <p className="text-xs text-slate">{compact ? "Estimate. Confirm the final price after checking the order." : "Staff confirm the final price. You pay at pickup."}</p>

      <Button size={size} onClick={primary.onClick} disabled={primary.disabled}>
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
  itemCount: number;
  totals: OrderPrice;
  primary: SummaryAction;
  showTotal: boolean;
};

// Phones: frosted bar stuck to the bottom with the live total and the main button
export function MobileOrderBar({ itemCount, totals, primary, showTotal }: MobileOrderBarProps) {
  const note = quoteNote(totals.quoteCount);
  return (
    <div
      data-material
      className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/5 bg-surface/80 px-4 pb-6 pt-3 shadow-[0_-4px_16px_rgb(15_30_61/0.06)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <div className={showTotal ? "flex items-center gap-3" : "flex flex-col gap-2"}>
        {showTotal && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate">
              Estimated · {itemCount} {itemCount === 1 ? "item" : "items"}
              {note && ` · ${note.replace("+ ", "+")}`}
            </p>
            <p className="tabular font-heading text-xl font-semibold tracking-[-0.01em]" aria-live="polite">
              {formatPeso(totals.total)}
            </p>
          </div>
        )}
        <Button onClick={primary.onClick} disabled={primary.disabled}>
          {primary.label}
        </Button>
        {!showTotal && primary.disabled && primary.hint && <p className="text-center text-xs text-slate">{primary.hint}</p>}
      </div>
      {showTotal && primary.disabled && primary.hint && <p className="mt-2 text-center text-xs text-slate">{primary.hint}</p>}
    </div>
  );
}
