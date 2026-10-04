"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export type OptionKind = "sizes" | "papers" | "addons";

// What the modal edits. Sizes use name + dimensions, paper types only name,
// add-ons name + price + unit.
export type OptionDraft = { name: string; dimensions: string; price: string; unit: string };

const TITLE: Record<OptionKind, string> = { sizes: "paper size", papers: "paper type", addons: "add-on" };
const NAME_LABEL: Record<OptionKind, [string, string]> = {
  sizes: ["Size name", "Legal"],
  papers: ["Paper type", "Bond 90gsm"],
  addons: ["Add-on name", "Spiral binding"],
};

// Add or edit one row on the Paper sizes / Paper types / Add-ons tabs
export function OptionModal({
  kind,
  initial,
  onClose,
  onSave,
  fixedPrice,
}: {
  kind: OptionKind;
  initial: OptionDraft | null; // null = adding a new one
  onClose: () => void;
  onSave: (draft: OptionDraft) => Promise<boolean>; // true = saved, close the modal
  fixedPrice?: string; // add-ons priced in code (lamination by size): shown instead of the price fields
}) {
  const [f, setF] = useState<OptionDraft>(initial ?? { name: "", dimensions: "", price: "", unit: "" });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const price = Number(f.price);
  const errors = {
    name: f.name.trim() ? undefined : "Enter a name.",
    price: kind !== "addons" || (f.price.trim() !== "" && Number.isFinite(price) && price >= 0) ? undefined : "Enter ₱0 or more.",
    unit: kind !== "addons" || f.unit.trim() ? undefined : "e.g. per set",
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Edit ${TITLE[kind]}` : `Add ${TITLE[kind]}`}
      footer={
        <>
          <Button size="md" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={saving}
            onClick={async () => {
              setTried(true);
              if (Object.values(errors).some(Boolean)) return;
              setSaving(true);
              const saved = await onSave({ ...f, name: f.name.trim(), dimensions: f.dimensions.trim(), unit: f.unit.trim() });
              setSaving(false);
              if (saved) onClose();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Input size="md" label={NAME_LABEL[kind][0]} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={NAME_LABEL[kind][1]} error={tried ? errors.name : undefined} />
      {kind === "sizes" && (
        <Input size="md" label="Dimensions (optional)" value={f.dimensions} onChange={(e) => setF({ ...f, dimensions: e.target.value })} placeholder="8.5 × 14 in" />
      )}
      {kind === "addons" && fixedPrice && <p className="text-sm text-slate">{fixedPrice}</p>}
      {kind === "addons" && !fixedPrice && (
        <div className="grid grid-cols-2 gap-3">
          <Input size="md" label="Price (₱)" type="number" inputMode="decimal" min={0} step="0.25" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} error={tried ? errors.price : undefined} />
          <Input size="md" label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="per set" error={tried ? errors.unit : undefined} />
        </div>
      )}
    </Modal>
  );
}
