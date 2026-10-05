"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, FileQuestion, Pencil, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { LAMINATION_LABELS } from "@/lib/price";
import type { InventoryItem, InventoryMove } from "@/lib/staff-types";
import { BackLink, tableHead } from "../parts";
import { useStaff } from "../StaffStore";
import { isLow, isOut } from "./Inventory";
import { ItemModal, StockModal, type StockAction } from "./InventoryModals";

const MOVE_STYLE: Record<InventoryMove["type"], { label: string; icon: LucideIcon; color: string }> = {
  in: { label: "Stock in", icon: ArrowDownToLine, color: "text-completed" },
  out: { label: "Stock out", icon: ArrowUpFromLine, color: "text-navy" },
  adjust: { label: "Adjustment", icon: Pencil, color: "text-pending" },
};

// What a linked item is used for, e.g. "Paper A4 · Bond 80gsm"
function usedForText(
  item: InventoryItem,
  paper: { sizes: { id: string; name: string }[]; types: { id: string; name: string }[]; photoSizes: { key: string; name: string }[] },
): string {
  const l = item.link;
  if (!l) return "Not linked: counted by hand only";
  if (l.kind === "lamination") return `Lamination film ${LAMINATION_LABELS[l.size]}`;
  if (l.kind === "photo") return `Photo paper ${paper.photoSizes.find((p) => p.key === l.size)?.name ?? l.size}`;
  const size = paper.sizes.find((s) => s.id === l.sizeId)?.name ?? "archived size";
  const type = paper.types.find((t) => t.id === l.typeId)?.name ?? "archived paper";
  return `Paper ${size} · ${type}`;
}

// S8: one item's numbers and its full movement log
export function ItemDetail({ itemId }: { itemId: string }) {
  const { inventory, paper, isAdmin, deleteItem } = useStaff();
  const router = useRouter();
  const [stock, setStock] = useState<StockAction>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const weekAgo = new Date().getTime() - 7 * 86_400_000;
  const used = item.moves.filter((m) => m.change < 0 && Date.parse(m.at) >= weekAgo).reduce((s, m) => s - m.change, 0);

  return (
    <>
      <BackLink href="/staff/inventory">Inventory</BackLink>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{item.name}</h1>
        {isOut(item) ? <StatusBadge status="out_of_stock" size="sm" /> : isLow(item) && <StatusBadge status="low_stock" size="sm" />}
        <div className="ml-auto flex gap-2">
          {isAdmin && (
            <Button size="md" variant="ghost" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          )}
          <Button size="md" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button size="md" variant="secondary" onClick={() => setStock({ item, type: "out" })}>
            Stock out
          </Button>
          <Button size="md" onClick={() => setStock({ item, type: "in" })}>
            Stock in
          </Button>
        </div>
      </div>

      <p className="-mt-2 text-sm text-slate">Used for: {usedForText(item, paper)}</p>

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
      <ItemModal key={`${item.id}-${editing}`} open={editing} item={item} onClose={() => setEditing(false)} />
      {/* Admin only: removes the item and its movement log (e.g. demo items) */}
      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete ${item.name}?`}
        description="The item and its movement log are removed. Orders aren't changed. This can't be undone."
        footer={
          <>
            <Button size="md" variant="secondary" onClick={() => setDeleting(false)}>
              Keep item
            </Button>
            <Button
              size="md"
              variant="danger"
              onClick={async () => {
                setDeleting(false);
                if (await deleteItem(item.id)) router.push("/staff/inventory");
              }}
            >
              Delete item
            </Button>
          </>
        }
      />
    </>
  );
}
