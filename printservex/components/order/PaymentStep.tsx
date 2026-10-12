"use client";

import { Banknote, CircleAlert, Paperclip, Smartphone, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/files";
import { formatPeso } from "@/lib/format";
import type { PaymentMethod } from "@/lib/orders";
import {
  checkGcashRef,
  checkReceipt,
  gcashUnavailable,
  METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_RULES,
  type PaymentChoice,
  type PaymentSettings,
} from "@/lib/payments";

type PaymentStepProps = {
  settings: PaymentSettings;
  choice: PaymentChoice;
  total: number; // the same estimated total as the price summary
  quoteCount: number; // lines whose price staff confirm later
  walkIn: boolean; // staff entering a walk-in: the receipt is optional (they see the customer's phone)
  showProblems: boolean; // after "Continue to review" was pressed
  problem: string | null; // what still blocks Review (lib/payments.ts paymentProblem)
  onChange: (patch: Partial<PaymentChoice>) => void;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-slate">{children}</h2>
);

// Step 4: how the customer pays. Nothing is charged here; GCash is checked by staff later.
export function PaymentStep({ settings, choice, total, quoteCount, walkIn, showProblems, problem, onChange }: PaymentStepProps) {
  const gcashOff = gcashUnavailable(settings, quoteCount, total);
  const refError = choice.method === "gcash" && showProblems ? checkGcashRef(choice.reference) : null;
  const receiptError = choice.receipt ? checkReceipt(choice.receipt) : null;
  const receiptMissing = showProblems && !choice.receipt && settings.receiptRequired && !walkIn;
  const who = walkIn ? "the customer" : "you";

  const methods: { value: PaymentMethod; icon: typeof Banknote; text: string; off: string | null }[] = [
    { value: "cash", icon: Banknote, text: "Pay at the shop when you pick up your order.", off: settings.cashEnabled || walkIn ? null : "Not available right now." },
    { value: "gcash", icon: Smartphone, text: "Scan the shop's QR code and pay now.", off: gcashOff },
  ];

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <Card padding="sm" className="flex flex-col gap-2 text-sm lg:p-6">
        <div className="flex justify-between gap-3">
          <span className="text-slate">Reference number</span>
          <span className="text-right font-medium">Given after {walkIn ? "you create the order" : "you submit"}</span>
        </div>
        <div className="flex justify-between gap-3 text-base font-semibold">
          <span>Order total</span>
          <span className="tabular">{formatPeso(total)}</span>
        </div>
        {quoteCount > 0 && <p className="text-xs font-medium text-slate">Some prices are confirmed by staff, so the total may change.</p>}
      </Card>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Payment method</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-3">
          {methods.map((m) => {
            const selected = choice.method === m.value;
            const disabled = m.off !== null;
            return (
              <label
                key={m.value}
                className={cn(
                  "relative flex min-h-[96px] flex-col gap-2 rounded-xl border bg-surface p-3 transition-[border-color,background-color,box-shadow] duration-150 ease-snap has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue lg:p-4",
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  selected ? "border-blue bg-blue-tint shadow-[inset_0_0_0_1px_var(--blue)]" : "border-border",
                  !selected && !disabled && "hover:border-[#b9c6da]",
                  showProblems && !choice.method && "border-cancelled",
                )}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={m.value}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChange({ method: m.value })}
                  className="sr-only"
                />
                <span className={cn("flex size-9 items-center justify-center rounded-lg", selected ? "bg-blue text-white" : "bg-processing-tint text-blue")}>
                  <m.icon size={18} aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-tight">{METHOD_LABELS[m.value]}</span>
                <span className="text-xs leading-snug text-slate">{m.off ?? m.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {choice.method === "cash" && (
        <Card padding="sm" className="flex flex-col gap-2 text-sm lg:p-6">
          <SectionTitle>Cash on Pickup</SectionTitle>
          <p>Pay at the printing shop when {who} collect{walkIn ? "s" : ""} the order.</p>
          <div className="flex justify-between gap-3">
            <span className="text-slate">Amount due</span>
            <span className="tabular font-semibold">{quoteCount > 0 ? `${formatPeso(total)} + items to confirm` : formatPeso(total)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate">Payment status</span>
            <span className="font-medium">{PAYMENT_STATUS_LABELS.unpaid}</span>
          </div>
        </Card>
      )}

      {choice.method === "gcash" && !gcashOff && (
        <Card padding="sm" className="flex flex-col gap-4 text-sm lg:p-6">
          <SectionTitle>Pay with GCash</SectionTitle>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {settings.qrUrl && (
              // The shop's own QR code, uploaded by the admin in Settings → Payment
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.qrUrl}
                alt={`GCash QR code of ${settings.accountName || "the shop"}`}
                className="mx-auto size-56 shrink-0 rounded-lg border border-border bg-white object-contain p-2 sm:mx-0"
              />
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex justify-between gap-3 text-base font-semibold">
                <span>Amount to pay</span>
                <span className="tabular">{formatPeso(total)}</span>
              </div>
              {settings.accountName && (
                <p>
                  Pay to: <b>{settings.accountName}</b>
                </p>
              )}
              <ol className="ml-5 list-decimal space-y-1 text-slate">
                <li>Open the GCash app and tap Scan.</li>
                <li>Scan this QR code.</li>
                <li>Check that the name matches{settings.accountName ? ` (${settings.accountName})` : ""}.</li>
                <li>Pay exactly {formatPeso(total)}. Type {walkIn ? "the customer's" : "your"} phone number in the message.</li>
                <li>Copy the reference number from the receipt and enter it below.</li>
                {!walkIn && <li>Take a screenshot of the receipt and upload it.</li>}
              </ol>
              {settings.instructions && <p className="text-slate">{settings.instructions}</p>}
            </div>
          </div>

          <Input
            size="md"
            label="GCash reference number"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={40}
            placeholder="Enter the reference number from your transaction"
            value={choice.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
            error={refError ?? undefined}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Receipt screenshot {settings.receiptRequired && !walkIn ? "" : <span className="font-normal text-slate">(optional)</span>}
            </span>
            {choice.receipt ? (
              <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-sm", receiptError ? "border-cancelled" : "border-border")}>
                <Paperclip size={18} aria-hidden className="shrink-0 text-slate" />
                <span className="min-w-0 flex-1 truncate font-medium">{choice.receipt.name}</span>
                <span className="shrink-0 text-slate">{formatFileSize(choice.receipt.size)}</span>
                <button
                  type="button"
                  onClick={() => onChange({ receipt: null })}
                  aria-label={`Remove ${choice.receipt.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate hover:bg-cancelled-tint hover:text-cancelled"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed px-3 py-2 text-sm font-semibold text-blue transition-colors duration-150 hover:bg-blue-tint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue",
                  receiptMissing ? "border-cancelled" : "border-[#b9c6da]",
                )}
              >
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) => {
                    onChange({ receipt: e.target.files?.[0] ?? null });
                    e.target.value = "";
                  }}
                />
                <Paperclip size={16} aria-hidden />
                Upload the receipt
                <span className="font-normal text-slate">· JPG or PNG, up to {RECEIPT_RULES.maxMb} MB</span>
              </label>
            )}
            {receiptError && <p className="text-xs text-cancelled">{receiptError}</p>}
          </div>

          <p className="rounded-lg bg-bg p-3 text-xs text-slate">
            Payment status: <b className="text-navy">{PAYMENT_STATUS_LABELS.pending_verification}</b>. Staff check the payment in GCash. It isn&apos;t
            marked paid until they confirm it.
          </p>
        </Card>
      )}

      {showProblems && problem && !refError && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <CircleAlert size={20} aria-hidden className="shrink-0" />
          {problem}
        </p>
      )}
    </div>
  );
}
