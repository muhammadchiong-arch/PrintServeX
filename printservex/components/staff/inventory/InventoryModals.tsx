"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { InventoryItem } from "@/lib/staff-types";
import { useStaff } from "../StaffStore";

export type StockAction = { item: InventoryItem; type: "in" | "out" } | null;

// Stock in (delivery) or stock out (used / damaged). Every change is written to the movement log.
export function StockModal({ action, onClose }: { action: StockAction; onClose: () => void }) {
  const { moveStock } = useStaff();
  const toast = useToast();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setQty("");
    setNote("");
    setTried(false);
    onClose();
  };

  if (!action) return <Modal open={false} onClose={close} title="" />;
  const { item, type } = action;
  const n = Number(qty);
  // Business rule: whole numbers only, and you can't take out more than is on hand
  const qtyError = !Number.isInteger(n) || n < 1 ? "Enter a whole number, 1 or more." : type === "out" && n > item.qty ? `Only ${item.qty} on hand.` : undefined;

  return (
    <Modal
      open
      onClose={close}
      title={type === "in" ? "Stock in" : "Stock out"}
      description={`${item.name} · on hand ${item.qty} ${item.unit}`}
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={saving}
            onClick={async () => {
              setTried(true);
              if (qtyError) return;
              setSaving(true);
              const saved = await moveStock(item.id, type, n, note.trim() || (type === "in" ? "Delivery" : "Used"));
              setSaving(false);
              if (!saved) return;
              toast({ message: `${item.name} updated to ${type === "in" ? item.qty + n : item.qty - n} ${item.unit}.` });
              close();
            }}
          >
            {type === "in" ? "Add" : "Remove"} {qtyError ? "" : `${n} ${item.unit}`}
          </Button>
        </>
      }
    >
      <div className="w-40">
        <Input size="md" label="Quantity" type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(e.target.value)} error={tried ? qtyError : undefined} />
      </div>
      <Input
        size="md"
        label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={type === "in" ? "e.g. Delivery from Office Warehouse, DR 55812" : "e.g. Used for PSX-20261001-0042"}
      />
    </Modal>
  );
}

export function AddItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addItem } = useStaff();
  const toast = useToast();
  const [f, setF] = useState({ name: "", unit: "", qty: "0", reorder: "" });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    name: f.name.trim() ? undefined : "Enter the item name.",
    unit: f.unit.trim() ? undefined : "Enter a unit, e.g. ream or bottle.",
    qty: Number.isInteger(Number(f.qty)) && Number(f.qty) >= 0 ? undefined : "Enter 0 or more.",
    reorder: Number.isInteger(Number(f.reorder)) && Number(f.reorder) >= 1 ? undefined : "Enter 1 or more.",
  };
  const close = () => {
    setF({ name: "", unit: "", qty: "0", reorder: "" });
    setTried(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add item"
      description="Track a new supply. You'll see a Low stock alert when it reaches the reorder level."
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={saving}
            onClick={async () => {
              setTried(true);
              if (Object.values(errors).some(Boolean)) return;
              setSaving(true);
              const saved = await addItem({ name: f.name.trim(), unit: f.unit.trim(), qty: Number(f.qty), reorderLevel: Number(f.reorder) });
              setSaving(false);
              if (!saved) return;
              toast({ message: `${f.name.trim()} added.` });
              close();
            }}
          >
            Add item
          </Button>
        </>
      }
    >
      <Input size="md" label="Item name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Sticker paper A4" error={tried ? errors.name : undefined} />
      <div className="grid grid-cols-3 gap-3">
        <Input size="md" label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="pack" error={tried ? errors.unit : undefined} />
        <Input size="md" label="On hand" type="number" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} error={tried ? errors.qty : undefined} />
        <Input size="md" label="Reorder level" type="number" min={1} value={f.reorder} onChange={(e) => setF({ ...f, reorder: e.target.value })} error={tried ? errors.reorder : undefined} />
      </div>
    </Modal>
  );
}
