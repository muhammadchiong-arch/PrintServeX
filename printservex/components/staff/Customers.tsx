"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatDate, formatPeso, formatPhone } from "@/lib/format";
import { normalizePhone } from "@/lib/order-details";
import { amountDue, type Order } from "@/lib/orders";
import { PageTitle, tableHead } from "./parts";
import { useStaff } from "./StaffStore";

type Customer = { phone: string; name: string; email?: string; orders: Order[]; spent: number; lastAt: string };

// Business rule: customers have no accounts, so one contact number = one customer
function groupCustomers(orders: Order[]): Customer[] {
  const byPhone = new Map<string, Order[]>();
  for (const o of orders) byPhone.set(o.customer.phone, [...(byPhone.get(o.customer.phone) ?? []), o]);
  return [...byPhone.entries()]
    .map(([phone, list]) => {
      const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        phone,
        name: sorted[0].customer.name,
        email: sorted.find((o) => o.customer.email)?.customer.email,
        orders: sorted,
        // "Total spent" counts paid orders only
        spent: sorted.reduce((s, o) => s + (o.payment?.amount ?? 0), 0),
        lastAt: sorted[0].createdAt,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

// S6: list on the left, order history of the selected customer on the right
export function Customers() {
  const { orders } = useStaff();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(params.get("phone") ?? "");

  const all = useMemo(() => groupCustomers(orders), [orders]);
  const q = query.trim().toLowerCase();
  const digits = normalizePhone(query);
  const list = all.filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
  const current = all.find((c) => c.phone === selected) ?? list[0];

  return (
    <>
      <PageTitle>Customers</PageTitle>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-xl bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3">
            <div className="relative w-[300px]">
              <label htmlFor="customer-search" className="sr-only">
                Search name or contact
              </label>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
              <input
                id="customer-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or contact"
                className="h-9 w-full rounded-lg border border-border pl-9 pr-3 text-sm focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20"
              />
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={Users} title="No customers found" text="Try part of the name or the last digits of the contact number." />
          ) : (
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Customers</caption>
              <thead className={tableHead}>
                <tr>
                  <th scope="col" className="px-4 py-2.5">Name</th>
                  <th scope="col" className="w-[150px] px-4 py-2.5">Contact</th>
                  <th scope="col" className="w-[70px] px-4 py-2.5">Orders</th>
                  <th scope="col" className="w-[110px] px-4 py-2.5 text-right">Total spent</th>
                  <th scope="col" className="w-[120px] px-4 py-2.5">Last order</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const active = c.phone === current?.phone;
                  return (
                    <tr
                      key={c.phone}
                      onClick={() => setSelected(c.phone)}
                      className={cn("cursor-pointer border-t border-border transition-colors duration-150", active ? "bg-blue-tint shadow-[inset_3px_0_0_var(--blue)]" : "hover:bg-row-hover")}
                    >
                      <td className="px-4 py-3">
                        {/* A real button so keyboard users can select a customer */}
                        <button type="button" onClick={() => setSelected(c.phone)} aria-pressed={active} className="rounded text-left font-semibold">
                          {c.name}
                        </button>
                      </td>
                      <td className="tabular px-4 py-3 text-slate">{formatPhone(c.phone)}</td>
                      <td className="px-4 py-3">{c.orders.length}</td>
                      <td className="tabular px-4 py-3 text-right">{formatPeso(c.spent)}</td>
                      <td className="px-4 py-3 text-slate">{formatDate(c.lastAt).replace(/, \d{4}$/, "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {current && (
          <aside aria-label={`${current.name} order history`} className="sticky top-[84px] flex flex-col rounded-xl bg-surface shadow-card">
            <div className="flex flex-col gap-1 border-b border-border p-5">
              <h2 className="text-lg">{current.name}</h2>
              <span className="text-sm text-slate">
                {formatPhone(current.phone)} · {current.email ?? "no email"}
              </span>
              <span className="text-sm text-slate">
                {current.orders.length} {current.orders.length === 1 ? "order" : "orders"} · {formatPeso(current.spent)} total
              </span>
            </div>
            <h3 className="px-5 pb-2 pt-4 font-sans text-xs font-semibold uppercase tracking-[0.04em] text-slate">Order history</h3>
            <ul>
              {current.orders.map((o) => (
                <li key={o.ref} className="flex items-center gap-3 border-t border-border px-5 py-2.5 text-sm">
                  <div className="flex flex-1 flex-col">
                    <Link href={`/staff/orders/${o.ref}`} className="tabular font-semibold text-blue hover:underline">
                      {o.ref}
                    </Link>
                    <span className="text-xs text-slate">
                      {formatDate(o.createdAt)} · {formatPeso(amountDue(o))}
                    </span>
                  </div>
                  <StatusBadge status={o.status} size="sm" />
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}
