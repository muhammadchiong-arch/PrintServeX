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
// paidOnline: the amount already paid by GCash (confirmed), or null
export function CancelModal({
  open,
  orderRef,
  paidOnline = null,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderRef: string;
  paidOnline?: number | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
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
      {paidOnline !== null && (
        <p className="rounded-lg bg-pending-tint px-3 py-2 text-sm">
          This order was paid by GCash ({formatPeso(paidOnline)}). Return the money to the customer: refunds aren&apos;t done in the system.
        </p>
      )}
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

// Business rule: a rejected GCash payment needs a reason; the customer sees it and pays at pickup
export function RejectPaymentModal({ open, orderRef, onClose, onConfirm }: { open: boolean; orderRef: string; onClose: () => void; onConfirm: (reason: string) => void }) {
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
      title={`Reject the GCash payment for ${orderRef}?`}
      description="Only reject if you can't find this payment in the shop's GCash app. The customer sees the reason and pays at pickup."
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Keep checking
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
            Reject payment
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. No payment found with this reference number"
        error={missing ? "Enter a reason so the customer knows what to do." : undefined}
      />
    </Modal>
  );
}

// Business rule: "Record payment & complete" is the only way to complete an order
export function PaymentModal({
  open,
  orderRef,
  amountDue,
  paidOnline = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderRef: string;
  amountDue: number;
  paidOnline?: boolean; // already paid by GCash and confirmed: nothing to collect
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");
  const receivedNum = Number(received || amountDue);
  const short = !paidOnline && method === "cash" && receivedNum < amountDue;
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
            {paidOnline ? "Complete order" : <>Record {formatPeso(amountDue)} &amp; complete</>}
          </Button>
        </>
      }
    >
      {paidOnline ? (
        <p className="text-sm">Paid by GCash ({formatPeso(amountDue)}), confirmed by staff. Nothing to collect: hand over the order.</p>
      ) : (
        <>
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
        </>
      )}
    </Modal>
  );
}
