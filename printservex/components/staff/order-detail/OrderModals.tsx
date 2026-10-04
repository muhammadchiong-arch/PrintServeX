"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Textarea";
import { formatPeso } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/orders";

// Business rule: cancelling always needs a reason; the customer sees it on their status page
export function CancelModal({ open, orderRef, onClose, onConfirm }: { open: boolean; orderRef: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const missing = tried && !reason.trim();

  const close = () => {
    setReason("");
    setTried(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Cancel ${orderRef}?`}
      description="The customer sees this reason on their status page. This can't be undone."
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Keep order
          </Button>
          <Button
            size="md"
            variant="danger"
            onClick={() => {
              setTried(true);
              if (reason.trim()) {
                onConfirm(reason.trim());
                close();
              }
            }}
          >
            Cancel order
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Files are password protected"
        error={missing ? "Enter a reason to cancel this order." : undefined}
      />
    </Modal>
  );
}

// Business rule: "Record payment & complete" is the only way to complete an order
export function PaymentModal({
  open,
  orderRef,
  amountDue,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderRef: string;
  amountDue: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");
  const receivedNum = Number(received || amountDue);
  const short = method === "cash" && receivedNum < amountDue;
  const change = method === "cash" && !short ? receivedNum - amountDue : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record payment for ${orderRef}`}
      description={`Amount due: ${formatPeso(amountDue)}`}
      footer={
        <>
          <Button size="md" variant="secondary" onClick={onClose}>
            Not yet
          </Button>
          <Button
            size="md"
            disabled={short}
            onClick={() => {
              onConfirm(method);
              setReceived("");
            }}
          >
            Record {formatPeso(amountDue)} &amp; complete
          </Button>
        </>
      }
    >
      <SegmentedControl
        label="Paid with"
        value={method}
        onChange={setMethod}
        options={[
          { value: "cash", label: "Cash" },
          { value: "gcash", label: PAYMENT_LABELS.gcash },
        ]}
      />
      {method === "cash" && (
        <div className="flex items-end gap-4">
          <div className="w-40">
            <Input
              size="md"
              label="Cash received (₱)"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={received}
              placeholder={amountDue.toFixed(2)}
              onChange={(e) => setReceived(e.target.value)}
              error={short ? "Less than the amount due" : undefined}
            />
          </div>
          {!short && (
            <p className="pb-2 text-sm">
              Change: <b className="tabular">{formatPeso(change)}</b>
            </p>
          )}
        </div>
      )}
      {method === "gcash" && (
        <p className="text-sm text-slate">Check the payment confirmation (GCash, Maya or bank transfer) on the customer&apos;s phone before confirming.</p>
      )}
    </Modal>
  );
}
