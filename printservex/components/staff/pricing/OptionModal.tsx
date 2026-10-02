"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export type OptionKind = "sizes" | "papers" | "addons";
export type OptionRow = { name: string; detail: string; archived: boolean };

const TEXT: Record<OptionKind, { title: string; name: string; detail: string; placeholder: [string, string] }> = {
  sizes: { title: "paper size", name: "Size name", detail: "Dimensions", placeholder: ["Legal", "8.5 × 14 in"] },
  papers: { title: "paper type", name: "Paper type", detail: "Available sizes", placeholder: ["Bond 90gsm", "A4, Short"] },
  addons: { title: "add-on", name: "Add-on name", detail: "Price and unit", placeholder: ["Spiral binding", "₱60.00 per set"] },
};

// Add or edit one row on the Paper sizes / Paper types / Add-ons tabs
export function OptionModal({ kind, row, onClose, onSave }: { kind: OptionKind; row: OptionRow | null; onClose: () => void; onSave: (row: OptionRow) => void }) {
  const t = TEXT[kind];
  const [name, setName] = useState(row?.name ?? "");
  const [detail, setDetail] = useState(row?.detail ?? "");
  const [tried, setTried] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? `Edit ${t.title}` : `Add ${t.title}`}
      footer={
        <>
          <Button size="md" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            onClick={() => {
              setTried(true);
              if (name.trim() && detail.trim()) onSave({ name: name.trim(), detail: detail.trim(), archived: row?.archived ?? false });
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <Input size="md" label={t.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.placeholder[0]} error={tried && !name.trim() ? "Enter a name." : undefined} />
      <Input size="md" label={t.detail} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={t.placeholder[1]} error={tried && !detail.trim() ? "Fill this in." : undefined} />
    </Modal>
  );
}
