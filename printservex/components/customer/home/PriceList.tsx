import { CircleAlert } from "lucide-react";
import { formatPeso } from "@/lib/format";
import { getPriceList } from "@/lib/price-list";
import type { AddOns } from "@/lib/price";
import { getShop } from "@/lib/shop-data";

const cellX = "px-4 lg:px-6";
const priceCol = "w-20 text-right lg:w-[120px]";

function AddOnNote({ paperTypeName, addOns }: { paperTypeName?: string; addOns: AddOns }) {
  const offered = [addOns.lamination, addOns.binding].flatMap((a) => (a ? [`${a.label} ${formatPeso(a.price)} ${a.unit}`] : []));
  if (!paperTypeName && offered.length === 0) return null;
  return (
    <p className={`border-t border-border py-3 text-sm text-slate lg:py-3.5 ${cellX}`}>
      {paperTypeName && <span className="max-lg:hidden">{paperTypeName} prices shown{offered.length > 0 && " · "}</span>}
      {offered.join(" · ")}
    </p>
  );
}

// Server component: reads prices from Supabase every time the page is rebuilt
export async function PriceList() {
  const [list, shop] = await Promise.all([getPriceList(), getShop()]);

  // Error state: Supabase could not be reached
  if (!list) {
    return (
      <div role="alert" className="flex gap-3 rounded-xl bg-surface p-4 shadow-card lg:p-6">
        <CircleAlert size={20} aria-hidden className="mt-0.5 shrink-0 text-cancelled" />
        <p className="text-sm">
          We couldn&apos;t load the price list right now. Please refresh the page, or call us at {shop.phone}.
        </p>
      </div>
    );
  }

  // Empty state: no prices set up yet in Supabase
  if (list.rows.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-4 text-sm text-slate shadow-card lg:p-6">
        Prices are being updated. You&apos;ll see the exact price when you place an order.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">Price per page{list.paperTypeName && `, ${list.paperTypeName}`}</caption>
        <thead className="bg-row-hover text-xs font-semibold uppercase tracking-[0.06em] text-slate">
          <tr>
            <th scope="col" className={`py-3 text-left ${cellX}`}>
              <span className="lg:hidden">Size</span>
              <span className="max-lg:hidden">Paper size</span>
            </th>
            <th scope="col" className={`py-3 ${priceCol}`}>B&amp;W</th>
            <th scope="col" className={`py-3 pr-4 lg:pr-6 ${priceCol}`}>Color</th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((row) => (
            <tr key={row.sizeId} className="border-t border-border">
              <th scope="row" className={`py-3 text-left font-normal lg:py-3.5 ${cellX}`}>
                {row.label}
              </th>
              <td className={`tabular py-3 lg:py-3.5 ${priceCol}`}>{row.bw === null ? "—" : formatPeso(row.bw)}</td>
              <td className={`tabular py-3 pr-4 lg:py-3.5 lg:pr-6 ${priceCol}`}>
                {row.color === null ? "—" : formatPeso(row.color)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddOnNote paperTypeName={list.paperTypeName} addOns={list.addOns} />
    </div>
  );
}

// Loading state: gray bars shaped like the table, shown while prices load
export function PriceListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading prices" className="overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="h-10 bg-row-hover" />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex items-center gap-4 border-t border-border py-4 ${cellX}`}>
          <span className="h-3 flex-1 animate-pulse rounded bg-border" />
          <span className="h-3 w-14 animate-pulse rounded bg-border" />
          <span className="h-3 w-14 animate-pulse rounded bg-border" />
        </div>
      ))}
    </div>
  );
}
