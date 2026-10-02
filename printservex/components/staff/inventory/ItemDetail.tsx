"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, FileQuestion, Pencil, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { InventoryMove } from "@/lib/sample/staff";
import { BackLink, tableHead } from "../parts";
import { staffNow, useStaff } from "../StaffStore";
import { isLow } from "./Inventory";
import { StockModal, type StockAction } from "./InventoryModals";

const MOVE_STYLE: Record<InventoryMove["type"], { label: string; icon: LucideIcon; color: string }> = {
  in: { label: "Stock in", icon: ArrowDownToLine, color: "text-completed" },
  out: { label: "Stock out", icon: ArrowUpFromLine, color: "text-navy" },
  adjust: { label: "Adjustment", icon: Pencil, color: "text-pending" },
};

// S8: one item's numbers and its full movement log
export function ItemDetail({ itemId }: { itemId: string }) {
  const { inventory } = useStaff();
  const [stock, setStock] = useState<StockAction>(null);
  const item = inventory.find((i) => i.id === itemId);

  if (!item) {
    return (
      <>
        <BackLink href="/staff/inventory">Inventory</BackLink>
        <div className="rounded-xl bg-surface shadow-card">
          <EmptyState icon={FileQuestion} title="Item not found" text="It may have been removed. Go back to the inventory list." />
        </div>
      </>
    );
  }

  // Used in the last 7 days = everything that went out (stock out + adjustments)
  const weekAgo = staffNow().getTime() - 7 * 86_400_000;
  const used = item.moves.filter((m) => m.change < 0 && Date.parse(m.at) >= weekAgo).reduce((s, m) => s - m.change, 0);

  return (
    <>
      <BackLink href="/staff/inventory">Inventory</BackLink>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{item.name}</h1>
        {isLow(item) && <StatusBadge status="low_stock" size="sm" />}
        <div className="ml-auto flex gap-2">
          <Button size="md" variant="secondary" onClick={() => setStock({ item, type: "out" })}>
            Stock out
          </Button>
          <Button size="md" onClick={() => setStock({ item, type: "in" })}>
            Stock in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          ["On hand", `${item.qty} ${item.unit}`],
          ["Reorder level", `${item.reorderLevel} ${item.unit}`],
          ["Used last 7 days", `${used} ${item.unit}`],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 rounded-xl bg-surface p-4 shadow-card">
            <span className="text-[13px] text-slate">{label}</span>
            <span className="tabular font-heading text-[28px] font-semibold leading-9">{value}</span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl bg-surface shadow-card">
        <h2 className="border-b border-border px-4 py-3.5 text-base">Movement log</h2>
        {item.moves.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate">No movements yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className={tableHead}>
              <tr>
                <th scope="col" className="w-[170px] px-4 py-2.5">Date</th>
                <th scope="col" className="w-[130px] px-4 py-2.5">Type</th>
                <th scope="col" className="w-[100px] px-4 py-2.5 text-right">Change</th>
                <th scope="col" className="w-[100px] px-4 py-2.5 text-right">Balance</th>
                <th scope="col" className="px-4 py-2.5">Note</th>
                <th scope="col" className="w-[150px] px-4 py-2.5">By</th>
              </tr>
            </thead>
            <tbody>
              {item.moves.map((m) => {
                const { label, icon: Icon, color } = MOVE_STYLE[m.type];
                return (
                  <tr key={`${m.at}-${m.note}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-slate">{formatDateTime(m.at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon size={14} aria-hidden className={color} />
                        {label}
                      </span>
                    </td>
                    <td className={cn("tabular px-4 py-2.5 text-right font-semibold", color)}>{m.change > 0 ? `+${m.change}` : `−${-m.change}`}</td>
                    <td className="tabular px-4 py-2.5 text-right">{m.balance}</td>
                    <td className="px-4 py-2.5">{m.note}</td>
                    <td className="px-4 py-2.5 text-slate">{m.by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <StockModal action={stock} onClose={() => setStock(null)} />
    </>
  );
}
