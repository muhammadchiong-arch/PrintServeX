"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Boxes, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageTitle, tableHead } from "../parts";
import { useStaff } from "../StaffStore";
import { ItemModal, StockModal, type StockAction } from "./InventoryModals";

// Business rule: an item is low on stock when the quantity is at or below its reorder level
export const isLow = (i: { qty: number; reorderLevel: number }) => i.qty <= i.reorderLevel;
// Business rule: nothing left. Printing that needs a linked out-of-stock item can't start.
export const isOut = (i: { qty: number }) => i.qty <= 0;

// S7
export function Inventory() {
  const { inventory } = useStaff();
  const lowOnly = useSearchParams().get("filter") === "low";
  const [stock, setStock] = useState<StockAction>(null);
  const [adding, setAdding] = useState(false);

  const items = lowOnly ? inventory.filter(isLow) : inventory;

  return (
    <>
      <PageTitle
        actions={
          <Button size="md" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden />
            Add item
          </Button>
        }
      >
        Inventory
      </PageTitle>

      {lowOnly && (
        <p className="flex items-center gap-2 self-start rounded-full bg-cancelled-tint py-1 pl-3 pr-1 text-sm text-cancelled">
          Showing low stock only
          <Link href="/staff/inventory" className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-navy hover:bg-bg">
            <X size={12} aria-hidden />
            Show all
          </Link>
        </p>
      )}

      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {items.length === 0 ? (
          <EmptyState icon={Boxes} title={lowOnly ? "Nothing is low on stock" : "No items yet"} text={lowOnly ? "Every supply is above its reorder level." : "Add the supplies you want to track."} />
        ) : (
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Inventory</caption>
            <thead className={tableHead}>
              <tr>
                <th scope="col" className="px-4 py-2.5">Item</th>
                <th scope="col" className="w-[110px] px-4 py-2.5">Unit</th>
                <th scope="col" className="w-[100px] px-4 py-2.5 text-right">Quantity</th>
                <th scope="col" className="w-[120px] px-4 py-2.5 text-right">Reorder level</th>
                <th scope="col" className="w-[130px] px-4 py-2.5">Stock</th>
                <th scope="col" className="w-[200px] px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <Link href={`/staff/inventory/${i.id}`} className="font-semibold text-blue hover:underline">
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate">{i.unit}</td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold">{i.qty}</td>
                  <td className="tabular px-4 py-2.5 text-right text-slate">{i.reorderLevel}</td>
                  <td className="px-4 py-2.5">
                    {isOut(i) ? (
                      <StatusBadge status="out_of_stock" size="sm" />
                    ) : isLow(i) ? (
                      <StatusBadge status="low_stock" size="sm" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-completed">
                        <Check size={12} aria-hidden />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" onClick={() => setStock({ item: i, type: "in" })}>
                        Stock in<span className="sr-only"> {i.name}</span>
                      </Button>
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" onClick={() => setStock({ item: i, type: "out" })}>
                        Stock out<span className="sr-only"> {i.name}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StockModal action={stock} onClose={() => setStock(null)} />
      <ItemModal key={adding ? "adding" : "closed"} open={adding} item={null} onClose={() => setAdding(false)} />
    </>
  );
}
