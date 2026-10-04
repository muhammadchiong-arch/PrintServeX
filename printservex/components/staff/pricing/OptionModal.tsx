"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LAMINATION_LABELS, LAMINATION_SIZE_IDS, type LaminationSize } from "@/lib/price";

export type OptionKind = "sizes" | "papers" | "addons";

// What the modal edits. Sizes use name + dimensions, paper types only name,
// add-ons name + price + unit. Lamination: name + one price per size instead.
export type OptionDraft = { name: string; dimensions: string; price: string; unit: string; laminationPrices?: Record<LaminationSize, string> };

const validPrice = (text: string) => text.trim() !== "" && Number.isFinite(Number(text)) && Number(text) >= 0 && Number(text) <= 10000;

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
}: {
  kind: OptionKind;
  initial: OptionDraft | null; // null = adding a new one
  onClose: () => void;
  onSave: (draft: OptionDraft) => Promise<boolean>; // true = saved, close the modal
}) {
  const [f, setF] = useState<OptionDraft>(initial ?? { name: "", dimensions: "", price: "", unit: "" });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const price = Number(f.price);
  const errors = {
    name: f.name.trim() ? undefined : "Enter a name.",
    price: kind !== "addons" || f.laminationPrices || (f.price.trim() !== "" && Number.isFinite(price) && price >= 0) ? undefined : "Enter ₱0 or more.",
    // Lamination: every size needs a price
    laminationPrices: f.laminationPrices && !LAMINATION_SIZE_IDS.every((id) => validPrice(f.laminationPrices![id])) ? "Enter ₱0 to ₱10,000 for each size." : undefined,
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
      {kind === "addons" && f.laminationPrices && (
        <div className="grid grid-cols-2 gap-3">
          {LAMINATION_SIZE_IDS.map((id) => (
            <Input
              key={id}
              size="md"
              label={`${LAMINATION_LABELS[id]} (₱ per sheet)`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.25"
              value={f.laminationPrices![id]}
              onChange={(e) => setF({ ...f, laminationPrices: { ...f.laminationPrices!, [id]: e.target.value } })}
              error={tried && !validPrice(f.laminationPrices![id]) ? "Enter ₱0 to ₱10,000." : undefined}
            />
          ))}
        </div>
      )}
      {kind === "addons" && !f.laminationPrices && (
        <div className="grid grid-cols-2 gap-3">
          <Input size="md" label="Price (₱)" type="number" inputMode="decimal" min={0} step="0.25" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} error={tried ? errors.price : undefined} />
          <Input size="md" label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="per set" error={tried ? errors.unit : undefined} />
        </div>
      )}
    </Modal>
  );
}
