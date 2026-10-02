import { Card } from "@/components/ui/Card";
import { formatPeso } from "@/lib/format";
import type { CustomerDetails } from "@/lib/order-details";
import { priceLine, type OrderPrice, type Prices } from "@/lib/price";
import { quoteNote } from "./PriceSummary";
import { describeLine, lineInput, type Catalog, type OrderLine } from "./types";

type ReviewStepProps = {
  details: CustomerDetails;
  chosen: string[];
  lines: OrderLine[];
  totals: OrderPrice;
  catalog: Catalog;
  prices: Prices;
  onEdit: (step: number) => void;
};

function CardTitle({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-slate">{title}</h2>
      <button type="button" onClick={onEdit} className="rounded px-1 py-2 text-sm font-semibold text-blue hover:underline">
        Edit<span className="sr-only"> {title.toLowerCase()}</span>
      </button>
    </div>
  );
}

// Step 4: everything the customer entered, grouped by service, before they submit
export function ReviewStep({ details, chosen, lines, totals, catalog, prices, onEdit }: ReviewStepProps) {
  const sizeIds = catalog.sizes.map((s) => s.id);
  const note = quoteNote(totals.quoteCount);

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <Card padding="sm" className="flex flex-col gap-1 lg:p-6">
        <CardTitle title="Your details" onEdit={() => onEdit(0)} />
        <span className="font-semibold">{details.name}</span>
        <span className="text-sm text-slate">{details.phone}</span>
        {details.email && <span className="text-sm text-slate">{details.email}</span>}
      </Card>

      <Card padding="sm" className="flex flex-col gap-3 lg:p-6">
        <CardTitle title={`Services · ${chosen.length}`} onEdit={() => onEdit(1)} />
        {chosen.map((serviceId, gi) => {
          const service = catalog.services.find((s) => s.id === serviceId);
          if (!service) return null;
          return (
            <div key={serviceId} className={gi > 0 ? "border-t border-border pt-3" : undefined}>
              <p className="text-sm font-semibold">{service.name}</p>
              <ul className="mt-1 flex flex-col gap-2">
                {lines
                  .filter((l) => l.serviceId === serviceId)
                  .map((l) => {
                    const p = priceLine(prices, lineInput(l, service), sizeIds);
                    return (
                      <li key={l.id} className="flex justify-between gap-3">
                        <div className="min-w-0">
                          {l.file && <p className="truncate text-sm">{l.file.name}</p>}
                          <p className="text-xs text-slate">{describeLine(l, service, catalog)}</p>
                          {l.details.notes?.trim() && <p className="mt-0.5 line-clamp-2 text-xs text-slate">“{l.details.notes.trim()}”</p>}
                        </div>
                        <span className="tabular shrink-0 text-sm font-semibold">
                          {p?.status === "priced" ? formatPeso(p.total) : <span className="text-xs font-medium text-slate">To be confirmed</span>}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
        <button type="button" onClick={() => onEdit(2)} className="self-start rounded px-1 py-1 text-sm font-semibold text-blue hover:underline">
          Edit files and options
        </button>
      </Card>

      <Card padding="sm" className="flex flex-col gap-2 text-sm lg:p-6">
        <div className="flex justify-between text-base font-semibold">
          <span>Estimated total</span>
          <span className="tabular">{formatPeso(totals.total)}</span>
        </div>
        {note && <p className="text-xs font-medium text-slate">{note}: staff confirm those prices after checking your order.</p>}
        <p className="text-xs text-slate">Staff check your order and confirm the final price. You pay at pickup.</p>
      </Card>
    </div>
  );
}
