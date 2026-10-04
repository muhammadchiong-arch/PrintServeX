"use client";

import Link from "next/link";
import { CircleCheck, Clock, PackageCheck, Printer, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration, formatPeso, formatTime, toDayKey } from "@/lib/format";
import { amountDue } from "@/lib/orders";
import { PageTitle, Panel } from "./parts";
import { useStaff } from "./StaffStore";

type Stat = { label: string; value: string; note: string; icon: LucideIcon; color: string };

// Business rule: Pending orders waiting this long get highlighted
const AGE_RED_MIN = 100;
const AGE_AMBER_MIN = 60;

const minutesSince = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / 60000;

export function Dashboard() {
  const { orders, inventory, activity } = useStaff();
  const now = new Date();
  const today = toDayKey(now.toISOString());
  const yesterday = toDayKey(new Date(now.getTime() - 86_400_000).toISOString());

  const pending = orders.filter((o) => o.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const processing = orders.filter((o) => o.status === "processing");
  const ready = orders.filter((o) => o.status === "ready");
  const paidOn = (day: string) => orders.filter((o) => o.payment && toDayKey(o.payment.at) === day);
  const paidToday = paidOn(today);
  const sumBy = (method: "cash" | "gcash") => paidToday.filter((o) => o.payment?.method === method).reduce((s, o) => s + (o.payment?.amount ?? 0), 0);
  const readySinceYesterday = ready.filter((o) => toDayKey(o.history.at(-1)?.at ?? o.createdAt) < today).length;
  const diff = paidToday.length - paidOn(yesterday).length;
  const lowStock = inventory.filter((i) => i.qty <= i.reorderLevel);

  const stats: Stat[] = [
    {
      label: "Pending",
      value: String(pending.length),
      note: pending[0] ? `Oldest ${formatDuration(minutesSince(pending[0].createdAt, now))} ago` : "Nothing waiting",
      icon: Clock,
      color: "text-pending",
    },
    {
      label: "Processing",
      value: String(processing.length),
      note: `${processing.filter((o) => o.items.some((i) => i.color)).length} with color pages`,
      icon: Printer,
      color: "text-processing",
    },
    { label: "Ready for Pickup", value: String(ready.length), note: `${readySinceYesterday} waiting since yesterday`, icon: PackageCheck, color: "text-ready" },
    { label: "Completed today", value: String(paidToday.length), note: `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} vs. yesterday`, icon: CircleCheck, color: "text-completed" },
    {
      label: "Today's sales",
      value: formatPeso(sumBy("cash") + sumBy("gcash")),
      note: `${formatPeso(sumBy("cash"))} cash · ${formatPeso(sumBy("gcash"))} online`,
      icon: Wallet,
      color: "text-navy",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        actions={
          <span className="text-sm text-slate" suppressHydrationWarning>
            {new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now)}
            {" · updated "}
            {formatTime(now.toISOString())}
          </span>
        }
      >
        Dashboard
      </PageTitle>

      <div className="grid grid-cols-5 gap-4">
        {stats.map(({ label, value, note, icon: Icon, color }) => (
          <div key={label} className="flex flex-col gap-1 rounded-xl bg-surface p-4 shadow-card">
            <span className="flex items-center gap-1.5 text-[13px] text-slate">
              <Icon size={16} aria-hidden className={color} />
              {label}
            </span>
            <span className="tabular font-heading text-3xl font-semibold">{value}</span>
            <span className="text-xs text-slate" suppressHydrationWarning>
              {note}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-4">
        <Panel title="Needs attention · oldest Pending" link={{ href: "/staff/orders?status=pending", label: "View all" }}>
          {pending.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate">No pending orders. Nice work.</p>
          ) : (
            <ul>
              {pending.slice(0, 5).map((o) => {
                const age = minutesSince(o.createdAt, now);
                return (
                  <li key={o.ref} className="grid grid-cols-[170px_minmax(0,1fr)_90px_110px] items-center gap-3 border-b border-border px-5 py-3 text-sm last:border-b-0">
                    <Link href={`/staff/orders/${o.ref}`} className="tabular font-semibold text-blue hover:underline">
                      {o.ref}
                    </Link>
                    <span className="truncate">{o.customer.name}</span>
                    <span className="tabular text-right">{formatPeso(amountDue(o))}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 justify-self-end text-xs font-semibold",
                        age >= AGE_RED_MIN ? "text-cancelled" : age >= AGE_AMBER_MIN ? "text-pending" : "text-slate",
                      )}
                      suppressHydrationWarning
                    >
                      <Clock size={14} aria-hidden />
                      {formatDuration(age)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Low stock" link={{ href: "/staff/inventory?filter=low", label: "Inventory" }}>
            {lowStock.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate">All supplies are above their reorder level.</p>
            ) : (
              <ul>
                {lowStock.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm last:border-b-0">
                    <Link href={`/staff/inventory/${i.id}`} className="flex-1 hover:underline">
                      {i.name}
                    </Link>
                    <span className="tabular text-slate">
                      {i.qty} / {i.reorderLevel} {i.unit}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-cancelled-tint px-2 py-0.5 text-xs font-semibold text-cancelled">
                      <TriangleAlert size={12} aria-hidden />
                      Low
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent activity" className="pb-2">
            <ul className="pt-2">
              {activity.length === 0 && <li className="px-5 py-2 text-[13px] text-slate">Nothing yet.</li>}
              {activity.slice(0, 5).map((a) => (
                <li key={`${a.at}-${a.details}`} className="flex gap-2.5 px-5 py-2 text-[13px] leading-[18px]">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#cbd5e1]" />
                  <span className="flex-1">
                    <b className="font-semibold">{a.who.split(" ")[0]}</b> · {a.action.toLowerCase()}
                    {a.details && `: ${a.details}`}
                  </span>
                  <span className="whitespace-nowrap text-slate">{formatTime(a.at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
