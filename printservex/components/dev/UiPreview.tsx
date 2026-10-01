"use client";

// TEMPORARY: shows every UI component so you can check the foundation.
// Delete this file and the two ui-preview pages once the real screens exist.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stepper } from "@/components/ui/Stepper";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/status";

type SampleRow = { ref: string; name: string; items: number; total: string; status: OrderStatus };

const rows: SampleRow[] = [
  { ref: "PSX-20261001-0042", name: "Juan Dela Cruz", items: 3, total: "₱148.00", status: "pending" },
  { ref: "PSX-20261001-0039", name: "Ma. Kristine Villanueva", items: 1, total: "₱36.00", status: "processing" },
  { ref: "PSX-20260930-0117", name: "Rodel Bautista", items: 5, total: "₱412.50", status: "ready" },
];

const columns: Column<SampleRow>[] = [
  { key: "ref", header: "Ref no.", render: (r) => <span className="tabular whitespace-nowrap font-semibold text-blue">{r.ref}</span> },
  { key: "name", header: "Customer", render: (r) => r.name },
  { key: "items", header: "Items", render: (r) => r.items },
  { key: "total", header: "Total", align: "right", render: (r) => r.total },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} size="sm" /> },
];

export function UiPreview({ size }: { size: "lg" | "md" }) {
  const [step, setStep] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">UI preview</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button size={size}>Place an order</Button>
          <Button size={size} variant="secondary">Track order</Button>
          <Button size={size} variant="ghost">Back</Button>
          <Button size={size} variant="dangerOutline">Cancel order</Button>
          <Button size={size} variant="danger">Cancel order</Button>
          <Button size={size} disabled>Submit order</Button>
        </div>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Inputs</h2>
        <Input size={size} label="Full name" defaultValue="Juan Dela Cruz" required />
        <Input size={size} label="Contact number" inputMode="tel" placeholder="0917 482 1953" hint="We text you when it's ready." />
        <Input size={size} label="Reference number" defaultValue="PSX-2026" error="Use the format PSX-YYYYMMDD-0000" />
        <Select
          size={size}
          label="Paper size"
          options={[
            { value: "a4", label: "A4 (8.27 × 11.69 in)" },
            { value: "short", label: "Short (8.5 × 11 in)" },
            { value: "long", label: "Long (8.5 × 13 in)" },
          ]}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl">Status badges</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          <StatusBadge status="low_stock" />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl">Stepper</h2>
        <Stepper steps={["Your details", "Files & options", "Review"]} current={step} />
        <div className="flex gap-2">
          <Button size="md" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>Previous step</Button>
          <Button size="md" onClick={() => setStep((s) => Math.min(3, s + 1))}>Next step</Button>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="p-6 pb-4 text-xl">Table</h2>
        <Table columns={columns} rows={rows} getRowKey={(r) => r.ref} caption="Sample orders" />
      </Card>

      <Card className="flex flex-wrap gap-3">
        <h2 className="w-full text-xl">Modal &amp; toast</h2>
        <Button size={size} variant="dangerOutline" onClick={() => setModalOpen(true)}>Open cancel modal</Button>
        <Button
          size={size}
          variant="secondary"
          onClick={() => toast({ message: "Status updated to Processing.", action: { label: "Undo", onClick: () => {} } })}
        >
          Show success toast
        </Button>
        <Button
          size={size}
          variant="secondary"
          onClick={() => toast({ kind: "error", message: "thesis-final.zip is not supported. Upload PDF, DOCX, JPG or PNG." })}
        >
          Show error toast
        </Button>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cancel PSX-20261001-0042?"
        description="The customer sees this reason on their status page."
        footer={
          <>
            <Button size="md" variant="secondary" onClick={() => setModalOpen(false)}>Keep order</Button>
            <Button size="md" variant="danger" onClick={() => setModalOpen(false)}>Cancel order</Button>
          </>
        }
      >
        <Input size="md" label="Reason" required placeholder="Why is this order cancelled?" />
      </Modal>
    </div>
  );
}
