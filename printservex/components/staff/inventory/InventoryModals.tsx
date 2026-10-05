"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { isLaminationSize, LAMINATION_LABELS, LAMINATION_SIZE_IDS } from "@/lib/price";
import type { InventoryItem, InventoryLink } from "@/lib/staff-types";
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

type UsedFor = "none" | "paper" | "lamination" | "photo";
type ItemForm = { name: string; unit: string; qty: string; reorder: string; usedFor: UsedFor; sizeId: string; typeId: string; lamination: string; photoSize: string };

const LAMINATION_OPTIONS = LAMINATION_SIZE_IDS.map((id) => ({ value: id, label: LAMINATION_LABELS[id] }));

function formOf(item: InventoryItem | null): ItemForm {
  const link = item?.link ?? null;
  return {
    name: item?.name ?? "",
    unit: item?.unit ?? "",
    qty: "0",
    reorder: item ? String(item.reorderLevel) : "",
    usedFor: link?.kind ?? "none",
    sizeId: link?.kind === "paper" ? link.sizeId : "",
    typeId: link?.kind === "paper" ? link.typeId : "",
    lamination: link?.kind === "lamination" ? link.size : "",
    photoSize: link?.kind === "photo" ? link.size : "",
  };
}

// Add a new item (item = null) or edit one. "Used for" links it to a paper or a lamination film,
// so starting a print takes it from stock. Links are chosen from lists (ids), never typed.
export function ItemModal({ open, item, onClose }: { open: boolean; item: InventoryItem | null; onClose: () => void }) {
  const { addItem, updateItem, paper } = useStaff();
  const toast = useToast();
  const [f, setF] = useState<ItemForm>(() => formOf(item));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const link: InventoryLink | null =
    f.usedFor === "paper" && f.sizeId && f.typeId
      ? { kind: "paper", sizeId: f.sizeId, typeId: f.typeId }
      : f.usedFor === "lamination" && isLaminationSize(f.lamination)
        ? { kind: "lamination", size: f.lamination }
        : f.usedFor === "photo" && f.photoSize
          ? { kind: "photo", size: f.photoSize }
          : null;
  const errors = {
    name: f.name.trim() ? undefined : "Enter the item name.",
    unit: f.unit.trim() ? undefined : "Enter a unit, e.g. ream or bottle.",
    qty: item || (Number.isInteger(Number(f.qty)) && Number(f.qty) >= 0) ? undefined : "Enter 0 or more.",
    reorder: Number.isInteger(Number(f.reorder)) && Number(f.reorder) >= 1 ? undefined : "Enter 1 or more.",
    link: f.usedFor !== "none" && !link ? "Choose what this item is." : undefined,
  };
  const close = () => {
    setF(formOf(item));
    setTried(false);
    onClose();
  };

  const save = async () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const fields = { name: f.name.trim(), unit: f.unit.trim(), reorderLevel: Number(f.reorder), link };
    const saved = item ? await updateItem(item.id, fields) : await addItem({ ...fields, qty: Number(f.qty) });
    setSaving(false);
    if (!saved) return;
    toast({ message: item ? `${fields.name} saved.` : `${fields.name} added.` });
    if (item) onClose();
    else close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={item ? "Edit item" : "Add item"}
      description={
        item
          ? "Change the details. The quantity only changes with Stock in / Stock out, so every change is logged."
          : "Track a new supply. You'll see a Low stock alert when it reaches the reorder level."
      }
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button size="md" disabled={saving} onClick={save}>
            {item ? "Save" : "Add item"}
          </Button>
        </>
      }
    >
      <Input size="md" label="Item name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Sticker paper A4" error={tried ? errors.name : undefined} />
      <div className={item ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
        <Input size="md" label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="pack" error={tried ? errors.unit : undefined} />
        {!item && <Input size="md" label="On hand" type="number" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} error={tried ? errors.qty : undefined} />}
        <Input size="md" label="Reorder level" type="number" min={1} value={f.reorder} onChange={(e) => setF({ ...f, reorder: e.target.value })} error={tried ? errors.reorder : undefined} />
      </div>
      <Select
        size="md"
        label="Used for"
        value={f.usedFor}
        onChange={(e) => setF({ ...f, usedFor: e.target.value as UsedFor })}
        options={[
          { value: "none", label: "Not linked (counted by hand only)" },
          { value: "paper", label: "Paper for printing" },
          { value: "lamination", label: "Lamination film" },
          ...(paper.photoSizes.length > 0 ? [{ value: "photo", label: "Photo paper (Photo Printing)" }] : []),
        ]}
        hint={f.usedFor === "none" ? undefined : "Starting a print takes this item from stock, and is blocked when there isn't enough."}
      />
      {f.usedFor === "paper" && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            size="md"
            label="Paper size"
            value={f.sizeId}
            onChange={(e) => setF({ ...f, sizeId: e.target.value })}
            options={[{ value: "", label: "Choose" }, ...paper.sizes.map((s) => ({ value: s.id, label: s.name }))]}
            error={tried && !f.sizeId ? errors.link : undefined}
          />
          <Select
            size="md"
            label="Paper type"
            value={f.typeId}
            onChange={(e) => setF({ ...f, typeId: e.target.value })}
            options={[{ value: "", label: "Choose" }, ...paper.types.map((t) => ({ value: t.id, label: t.name }))]}
            error={tried && !f.typeId ? errors.link : undefined}
          />
        </div>
      )}
      {f.usedFor === "photo" && (
        <Select
          size="md"
          label="Photo size"
          value={f.photoSize}
          onChange={(e) => setF({ ...f, photoSize: e.target.value })}
          options={[{ value: "", label: "Choose" }, ...paper.photoSizes.map((p) => ({ value: p.key, label: p.name }))]}
          hint="1 sheet is taken per print."
          error={tried ? errors.link : undefined}
        />
      )}
      {f.usedFor === "lamination" && (
        <Select
          size="md"
          label="Lamination size"
          value={f.lamination}
          onChange={(e) => setF({ ...f, lamination: e.target.value })}
          options={[{ value: "", label: "Choose" }, ...LAMINATION_OPTIONS]}
          error={tried ? errors.link : undefined}
        />
      )}
    </Modal>
  );
}
