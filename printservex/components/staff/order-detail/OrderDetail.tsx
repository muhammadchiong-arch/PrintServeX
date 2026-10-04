"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Clock, Download, FileQuestion, Lock, PackageCheck, Printer, Wallet, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatPeso, formatPhone, formatTime } from "@/lib/format";
import { amountDue, canCancel, estimatedTotal, isQuote, itemAddOns, itemPrinting, itemTotal, laminationLabel, laminationLine, NEXT_STATUS, PAYMENT_LABELS, quoteCount, type Order, type OrderItem } from "@/lib/orders";
import { areaSqFt, BACKGROUND_LABELS } from "@/lib/services";
import { getFileLink } from "@/lib/staff-actions";
import { STATUS_LABELS, type OrderStatus } from "@/lib/status";
import { BackLink, CardLabel } from "../parts";
import { useStaff } from "../StaffStore";
import { CancelModal, PaymentModal } from "./OrderModals";

const card = "flex flex-col rounded-xl bg-surface px-5 py-4 text-sm shadow-card";

const HISTORY_ICON: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: "bg-pending-tint text-pending" },
  processing: { icon: Printer, className: "bg-processing-tint text-processing" },
  ready: { icon: PackageCheck, className: "bg-ready-tint text-ready" },
  completed: { icon: CircleCheck, className: "bg-completed-tint text-completed" },
  cancelled: { icon: CircleX, className: "bg-cancelled-tint text-cancelled" },
};

// S4
export function OrderDetail({ orderRef }: { orderRef: string }) {
  const staff = useStaff();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false); // a change is being saved

  const order = staff.orders.find((o) => o.ref === orderRef);
  if (!order) {
    return (
      <>
        <BackLink href="/staff/orders">Orders</BackLink>
        <div className="rounded-xl bg-surface shadow-card">
          <EmptyState icon={FileQuestion} title="Order not found" text={`There is no order ${orderRef}. Check the reference number.`} />
        </div>
      </>
    );
  }

  const next = NEXT_STATUS[order.status];
  const closed = order.status === "completed" || order.status === "cancelled";
  const pastOrders = staff.orders.filter((o) => o.customer.phone === order.customer.phone && o.ref !== order.ref).length;

  const advance = async () => {
    if (next === "completed") return setPayOpen(true);
    if (next !== "processing" && next !== "ready") return;
    setBusy(true);
    const saved = await staff.setStatus(order.ref, next);
    setBusy(false);
    if (saved) {
      toast({
        message: next === "ready" ? "Marked Ready for Pickup. Customer status page updated." : `Status updated to ${STATUS_LABELS[next]}.`,
      });
    }
  };

  // Business rule: show ONLY the next valid action for the current status
  const primaryLabel = { processing: "Start processing", ready: "Mark ready for pickup", completed: "Record payment & complete" } as const;
  const PrimaryIcon = next === "processing" ? Printer : next === "ready" ? PackageCheck : Wallet;

  return (
    <>
      <BackLink href="/staff/orders">Orders</BackLink>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="tabular text-2xl">{order.ref}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-slate">
          {order.source === "online" ? "Online" : "Walk-in"} · {formatDate(order.createdAt)}, {formatTime(order.createdAt)}
        </span>
        <div className="ml-auto flex gap-2">
          {canCancel(order.status) && (
            <Button size="md" variant="dangerOutline" disabled={busy} onClick={() => setCancelOpen(true)}>
              <X size={16} aria-hidden />
              Cancel
            </Button>
          )}
          {next && next !== "cancelled" && (
            <Button size="md" disabled={busy} onClick={advance}>
              <PrimaryIcon size={16} aria-hidden />
              {primaryLabel[next as keyof typeof primaryLabel]}
            </Button>
          )}
          {closed && (
            <span className="flex items-center gap-1.5 text-sm text-slate">
              <Lock size={16} aria-hidden />
              This order is closed. No further actions.
            </span>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4">
          {order.items.map((i, index) => (
            <ItemCard key={`${index}-${i.fileName ?? i.serviceName}`} item={i} orderRef={order.ref} position={index + 1} />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <section className={cn(card, "gap-1.5")}>
            <CardLabel>Customer</CardLabel>
            <span className="text-[15px] font-semibold">{order.customer.name}</span>
            <span className="tabular">{formatPhone(order.customer.phone)}</span>
            <span className="text-slate">
              {order.customer.email ?? "No email given"} ·{" "}
              <Link href={`/staff/customers?phone=${order.customer.phone}`} className="text-blue hover:underline">
                {pastOrders} past {pastOrders === 1 ? "order" : "orders"}
              </Link>
            </span>
          </section>

          <PriceCard order={order} locked={closed} />

          <section className={cn(card, "gap-3")}>
            <CardLabel>Status history</CardLabel>
            <ol className="flex flex-col gap-3">
              {[...order.history].reverse().map((h) => {
                const { icon: Icon, className } = HISTORY_ICON[h.status];
                return (
                  <li key={`${h.status}-${h.at}`} className="flex gap-2.5">
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", className)}>
                      <Icon size={12} aria-hidden />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold">{STATUS_LABELS[h.status]}</span>
                      <span className="text-xs text-slate">
                        {formatDateTime(h.at)} · {h.note ? `${h.note} · ` : ""}
                        {h.by}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <RemarksCard order={order} />
        </div>
      </div>

      <CancelModal
        open={cancelOpen}
        orderRef={order.ref}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          setBusy(true);
          if (await staff.cancelOrder(order.ref, reason)) toast({ message: `${order.ref} cancelled.` });
          setBusy(false);
        }}
      />
      <PaymentModal
        open={payOpen}
        orderRef={order.ref}
        amountDue={amountDue(order)}
        onClose={() => setPayOpen(false)}
        onConfirm={async (method) => {
          setPayOpen(false);
          setBusy(true);
          // The server takes the amount from the order itself (final price, or the estimate)
          if (await staff.completeOrder(order.ref, method)) {
            toast({ message: `Payment of ${formatPeso(amountDue(order))} (${PAYMENT_LABELS[method]}) recorded. Order completed.` });
          }
          setBusy(false);
        }}
      />
    </>
  );
}

// Price breakdown with the editable final price
function PriceCard({ order, locked }: { order: Order; locked: boolean }) {
  const staff = useStaff();
  const toast = useToast();
  const estimate = estimatedTotal(order);
  const printing = order.items.reduce((s, i) => s + itemPrinting(i), 0);
  const bindingSets = order.items.filter((i) => i.binding).reduce((s, i) => s + (i.copies ?? 0), 0);
  const addOns = order.items.reduce((s, i) => s + itemAddOns(i), 0);
  // Non-document services with a price (binding service, photos, design, ...)
  const otherServices = order.items.filter((i) => i.kind !== "document").reduce((s, i) => s + itemTotal(i), 0);
  const toConfirm = quoteCount(order);

  const [amount, setAmount] = useState((order.final?.amount ?? estimate).toFixed(2));
  const [note, setNote] = useState(order.final?.note ?? "");
  const [saving, setSaving] = useState(false);
  const value = Number(amount);
  const valid = amount !== "" && Number.isFinite(value) && value >= 0;
  const changed = valid && (value !== (order.final?.amount ?? estimate) || note !== (order.final?.note ?? ""));
  // Business rule: if the final price differs from the estimate, staff must say why
  const needsNote = valid && value !== estimate && !note.trim();

  return (
    <section className={cn(card, "gap-2")}>
      <CardLabel>Price</CardLabel>
      <div className="flex justify-between">
        <span className="text-slate">Printing</span>
        <span className="tabular">{formatPeso(printing)}</span>
      </div>
      {addOns > 0 && (
        <div className="flex justify-between">
          <span className="text-slate">{bindingSets > 0 ? `Add-ons (binding × ${bindingSets})` : "Add-ons"}</span>
          <span className="tabular">{formatPeso(addOns)}</span>
        </div>
      )}
      {otherServices > 0 && (
        <div className="flex justify-between">
          <span className="text-slate">Other services</span>
          <span className="tabular">{formatPeso(otherServices)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-border pt-2">
        <span>Estimated</span>
        <span className="tabular font-semibold">{formatPeso(estimate)}</span>
      </div>
      {toConfirm > 0 && !locked && (
        <p className="rounded-lg bg-pending-tint px-3 py-2 text-xs">
          {toConfirm} {toConfirm === 1 ? "item has" : "items have"} no price yet. Add {toConfirm === 1 ? "its" : "their"} cost to the final price below, with a note.
        </p>
      )}

      {locked ? (
        order.final && (
          <>
            <div className="flex justify-between font-semibold">
              <span>Final price</span>
              <span className="tabular">{formatPeso(order.final.amount)}</span>
            </div>
            {order.final.note && <p className="text-xs text-slate">Note shown to customer: {order.final.note}</p>}
          </>
        )
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!changed || needsNote || saving) return;
            setSaving(true);
            if (await staff.setFinalPrice(order.ref, Math.round(value * 100) / 100, note.trim())) {
              toast({ message: "Final price saved. The customer sees it on their status page." });
            }
            setSaving(false);
          }}
        >
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Final price</span>
            <span className="flex h-9 w-[140px] items-center gap-1 rounded-lg border border-border px-3 focus-within:border-blue focus-within:ring-[3px] focus-within:ring-blue/20">
              <span className="text-slate">₱</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular w-full bg-transparent font-semibold outline-none"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate">Note shown to customer</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 4 blank pages not printed"
              className={cn(
                "h-9 rounded-lg border px-3 text-sm focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20",
                needsNote && changed ? "border-cancelled" : "border-border",
              )}
            />
            {needsNote && changed && <span className="text-xs text-cancelled">Add a note that explains the price change.</span>}
          </label>
          {changed && (
            <Button type="submit" size="md" variant="secondary" disabled={needsNote || saving} className="self-end">
              {saving ? "Saving…" : "Save final price"}
            </Button>
          )}
        </form>
      )}

      {order.payment && (
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-completed-tint py-0.5 pl-2 pr-2.5 text-xs font-semibold text-completed">
            <CircleCheck size={12} aria-hidden />
            Paid
          </span>
          <span className="tabular">
            {PAYMENT_LABELS[order.payment.method]} · {formatPeso(order.payment.amount)}
          </span>
        </div>
      )}
    </section>
  );
}

// Staff-only notes, saved when the field loses focus
function RemarksCard({ order }: { order: Order }) {
  const staff = useStaff();
  const toast = useToast();
  const [text, setText] = useState(order.remarks ?? "");
  return (
    <div className="rounded-xl bg-surface px-5 py-4 shadow-card">
      <Textarea
        label="Remarks"
        labelNote="(staff only)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => {
          if (text !== (order.remarks ?? "") && (await staff.setRemarks(order.ref, text))) {
            toast({ message: "Remarks saved." });
          }
        }}
        placeholder="Notes for other staff, e.g. Customer asked to bind Ch1-2 only."
      />
    </div>
  );
}

// Opens a short-lived download link for one uploaded file (made on the server)
function DownloadButton({ orderRef, position, fileName }: { orderRef: string; position: number; fileName: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="md"
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const link = await getFileLink(orderRef, position);
          if (link.ok) window.location.assign(link.url);
          else toast({ kind: "error", message: link.error });
        } catch {
          toast({ kind: "error", message: "We couldn't reach the server. Try again." });
        }
        setLoading(false);
      }}
    >
      <Download size={16} aria-hidden />
      {loading ? "Opening…" : "Download"}
      <span className="sr-only"> {fileName}</span>
    </Button>
  );
}

// One line of the order: the service, its options and its file (if any)
function ItemCard({ item: i, orderRef, position }: { item: OrderItem; orderRef: string; position: number }) {
  const d = i.details ?? {};
  const area = i.kind === "large_format" ? areaSqFt(d) : null;
  const fields: [string, string][] = (() => {
    switch (i.kind) {
      case "document": {
        // Lamination: size, price per sheet × sheets = subtotal, as saved with the order
        const lam = laminationLine(i);
        return [
          ["Paper size", i.size ?? "—"],
          ["Paper type", i.paper ?? "—"],
          ["Print", i.color ? "Color" : "B&W"],
          ["Pages", String(i.pages ?? "—")],
          ["Copies", String(i.copies ?? "—")],
          ["Sides", d.sides === "double" ? "Double" : "Single"],
          ["Add-ons", [i.binding && "Binding", i.lamination && laminationLabel(i)].filter(Boolean).join(", ") || "None"],
          ...(lam ? [["Lamination", `${lam.size} · ${lam.quantity} × ${formatPeso(lam.unitPrice)} = ${formatPeso(lam.subtotal)}`] as [string, string]] : []),
        ];
      }
      case "finishing":
        return [["Paper size", d.sizeName ?? "—"], ["Quantity", String(i.quantity)]];
      case "photo":
        return [["Background", d.background ? BACKGROUND_LABELS[d.background] : "—"], ["Quantity", String(i.quantity)]];
      case "design":
        return [["Request", d.mode === "file" ? "Use customer's file" : "Design it for them"], ["Size", d.sizeText || "—"], ["Quantity", String(i.quantity)]];
      case "large_format":
        return [["Size", d.width !== undefined && d.height !== undefined ? `${d.width} × ${d.height} ${d.unit}` : "—"], ["Area", area !== null ? `${area} sq ft each` : "—"], ["Quantity", String(i.quantity)]];
      case "custom":
        return [["Size", d.sizeText || "—"], ["Quantity", String(i.quantity)]];
      case "school_business":
        return [["Paper size", d.sizeName ?? "—"], ["Print", d.color ? "Color" : "B&W"], ["Quantity", String(i.quantity)]];
    }
  })();

  return (
    <article className={cn("gap-5 rounded-xl bg-surface p-4 shadow-card", i.fileName ? "grid grid-cols-[150px_minmax(0,1fr)]" : "flex flex-col")}>
      {/* No page previews yet: open the file with Download */}
      {i.fileName && (
        <div className="flex h-[196px] items-center justify-center rounded-lg border border-border bg-[repeating-linear-gradient(135deg,#f6f8fb_0_8px,#ecf0f5_8px_16px)] p-2 text-center font-mono text-[11px] text-slate">
          page 1 preview
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate">
              {i.categoryName} · {i.serviceName}
            </p>
            <h2 className="truncate font-sans text-[15px] font-semibold">{i.fileName ?? i.serviceName}</h2>
            <p className="text-[13px] text-slate">
              {i.fileName
                ? [i.kind === "document" && `${i.pages} ${i.pages === 1 ? "page" : "pages"}`, i.fileSize].filter(Boolean).join(" · ")
                : "No file attached"}
            </p>
          </div>
          {i.fileName && <DownloadButton orderRef={orderRef} position={position} fileName={i.fileName} />}
        </div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
          {fields.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-xs text-slate">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {d.notes && (
          <p className="whitespace-pre-line rounded-lg bg-bg px-3 py-2 text-sm">
            <span className="text-xs text-slate">Customer notes: </span>
            {d.notes}
          </p>
        )}
        <div className="mt-auto flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-slate">
            {i.kind === "document" && i.rate !== null
              ? `${i.pages} pp × ${i.copies} × ${formatPeso(i.rate)}${itemAddOns(i) > 0 ? ` + add-ons ${formatPeso(itemAddOns(i))}` : ""}`
              : `Quantity ${i.quantity}`}
          </span>
          {isQuote(i) ? (
            <span className="rounded-full bg-pending-tint px-2 py-0.5 text-xs font-semibold text-pending">Price to be confirmed</span>
          ) : (
            <span className="tabular font-semibold">{formatPeso(itemTotal(i))}</span>
          )}
        </div>
      </div>
    </article>
  );
}
