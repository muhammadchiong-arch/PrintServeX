import { Card } from "@/components/ui/Card";
import { formatPeso } from "@/lib/format";
import type { CustomerDetails } from "@/lib/order-details";
import { priceFile, type OrderPrice, type PriceRule } from "@/lib/price";
import { describeOptions, type Catalog, type OrderFile } from "./types";

type ReviewStepProps = {
  details: CustomerDetails;
  files: OrderFile[];
  totals: OrderPrice;
  catalog: Catalog;
  rules: PriceRule[];
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

// Step 3: everything the customer entered, before they submit
export function ReviewStep({ details, files, totals, catalog, rules, onEdit }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <Card padding="sm" className="flex flex-col gap-1 lg:p-6">
        <CardTitle title="Your details" onEdit={() => onEdit(0)} />
        <span className="font-semibold">{details.name}</span>
        <span className="text-sm text-slate">{details.phone}</span>
        {details.email && <span className="text-sm text-slate">{details.email}</span>}
      </Card>

      <Card padding="sm" className="flex flex-col gap-3 lg:p-6">
        <CardTitle title={`Files · ${files.length}`} onEdit={() => onEdit(1)} />
        <ul className="flex flex-col">
          {files.map((f, i) => (
            <li key={f.id} className={`flex justify-between gap-3 ${i > 0 ? "mt-3 border-t border-border pt-3" : ""}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{f.file.name}</p>
                <p className="text-xs text-slate">{describeOptions(f.options, catalog)}</p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold">{formatPeso(priceFile(rules, f.options)?.total ?? 0)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="sm" className="flex flex-col gap-2 text-sm lg:p-6">
        <div className="flex justify-between">
          <span className="text-slate">Printing</span>
          <span className="tabular">{formatPeso(totals.printing)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Add-ons</span>
          <span className="tabular">{formatPeso(totals.addOns)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Estimated total</span>
          <span className="tabular">{formatPeso(totals.total)}</span>
        </div>
        <p className="text-xs text-slate">Staff check your files and confirm the final price. You pay at pickup.</p>
      </Card>
    </div>
  );
}
