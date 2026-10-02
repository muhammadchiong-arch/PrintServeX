"use client";

import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleX, MessageSquareText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPeso } from "@/lib/format";
import { describeItem, estimatedTotal, isQuote, itemTotal, PAYMENT_LABELS, type Order } from "@/lib/orders";
import { useShop } from "@/components/ShopProvider";
import { StatusTimeline } from "./StatusTimeline";

const sectionTitle = "text-xs font-semibold uppercase tracking-[0.06em] text-slate";

// C5: what the customer sees after a successful lookup
export function OrderStatusView({ order }: { order: Order }) {
  const shop = useShop();
  const estimate = estimatedTotal(order);
  const finalChanged = order.final && order.final.amount !== estimate;

  return (
    <div className="flex flex-col gap-3">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/track" aria-label="Look up another order" className="flex size-11 items-center justify-center rounded-lg hover:bg-surface">
          <ArrowLeft size={24} aria-hidden />
        </Link>
        <h1 className="tabular font-heading text-base font-semibold sm:text-xl">{order.ref}</h1>
      </div>

      <Card padding="sm" className="flex flex-col gap-4 sm:p-6">
        <StatusBadge status={order.status} className="self-start py-1 pl-2.5 pr-3 text-sm" />
        <StatusTimeline order={order} />
      </Card>

      {order.status === "ready" && (
        <p className="flex gap-2 rounded-lg bg-ready-tint p-3 text-sm text-[#5b21b6]">
          <MessageSquareText size={20} aria-hidden className="shrink-0" />
          <span>
            <b>Pickup note:</b> {shop.pickupNote}
          </span>
        </p>
      )}
      {order.status === "cancelled" && order.cancelReason && (
        <p className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <CircleX size={20} aria-hidden className="shrink-0" />
          <span>
            <b>Reason:</b> {order.cancelReason} Questions? Call {shop.phone}.
          </span>
        </p>
      )}

      <Card padding="sm" className="flex flex-col gap-2 text-sm sm:p-6">
        <h2 className={sectionTitle}>Order details</h2>
        {order.items.map((i, index) => (
          <div key={`${index}-${i.fileName ?? i.serviceName}`} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="font-medium">{i.serviceName ?? "Document printing"}</span>
              {i.fileName && <span className="break-all text-slate"> · {i.fileName}</span>}
              <span className="block text-xs text-slate">{describeItem(i)}</span>
            </span>
            {isQuote(i) ? (
              <span className="shrink-0 text-xs text-slate">To be confirmed</span>
            ) : (
              <span className="tabular shrink-0">{formatPeso(itemTotal(i))}</span>
            )}
          </div>
        ))}

        <div className="flex justify-between border-t border-border pt-2 text-slate">
          <span>Estimated price</span>
          <span className={finalChanged ? "tabular line-through" : "tabular"}>{formatPeso(estimate)}</span>
        </div>
        {order.final ? (
          <>
            <div className="flex justify-between text-base font-semibold">
              <span>Final price</span>
              <span className="tabular">{formatPeso(order.final.amount)}</span>
            </div>
            {order.final.note && <p className="text-xs text-slate">Adjusted by staff: {order.final.note}</p>}
          </>
        ) : (
          order.status !== "cancelled" && (
            <p className="text-xs text-slate">
              {order.items.some(isQuote) ? "Some items are priced by staff, so the estimate isn't complete. " : ""}
              Staff confirm the final price after checking your order.
            </p>
          )
        )}

        {order.payment && (
          <div className="flex justify-between border-t border-border pt-2">
            <span className="flex items-center gap-1.5 font-semibold text-completed">
              <CircleCheck size={20} aria-hidden />
              Paid · {PAYMENT_LABELS[order.payment.method]}
            </span>
            <span className="tabular">{formatPeso(order.payment.amount)}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
