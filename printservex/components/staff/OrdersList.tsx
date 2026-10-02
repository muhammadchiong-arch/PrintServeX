"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList, Plus, Search } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { formatDateTime, formatPeso, toDayKey } from "@/lib/format";
import { normalizePhone } from "@/lib/order-details";
import { amountDue } from "@/lib/orders";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/status";
import { PageTitle, tableHead } from "./parts";
import { useStaff } from "./StaffStore";

const PAGE_SIZE = 10;
type TabValue = OrderStatus | "all";

const inputClass =
  "h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20";

/**
 * S3. All filters live in the URL (?status=pending&q=juan&from=2026-09-30&page=2),
 * so the top-bar search, the dashboard "View all" link and the browser Back button all work.
 */
export function OrdersList() {
  const { orders } = useStaff();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = (params.get("status") ?? "all") as TabValue;
  const q = params.get("q") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  // The filter box keeps its own text while typing; if the URL's search changes
  // from somewhere else (the top-bar search), the box follows it
  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
  }

  const setParams = (patch: Record<string, string>) => {
    // Read the live URL (not the last render's copy), so quick changes in a row don't undo each other
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page"); // a new filter starts again on page 1
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Search matches the reference number, name, or contact number (with or without spaces)
  const needle = q.trim().toLowerCase();
  const phoneNeedle = normalizePhone(q);
  const matching = orders
    .filter((o) => {
      const day = toDayKey(o.createdAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!needle) return true;
      return (
        o.ref.toLowerCase().includes(needle) ||
        o.customer.name.toLowerCase().includes(needle) ||
        (phoneNeedle.length >= 3 && o.customer.phone.includes(phoneNeedle))
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const count = (s: TabValue) => (s === "all" ? matching.length : matching.filter((o) => o.status === s).length);
  const rows = status === "all" ? matching : matching.filter((o) => o.status === status);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageTitle
        actions={
          <Link href="/staff/walk-in" className={buttonClasses("primary", "md")}>
            <Plus size={16} aria-hidden />
            Walk-in order
          </Link>
        }
      >
        Orders
      </PageTitle>

      <div className="flex flex-col rounded-xl bg-surface shadow-card">
        <Tabs
          label="Order status"
          value={status}
          onChange={(v) => setParams({ status: v === "all" ? "" : v })}
          tabs={[{ value: "all" as TabValue, label: "All", count: count("all") }, ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: count(s) }))]}
        />

        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-3">
          <div className="relative w-[300px]">
            <label htmlFor="orders-filter" className="sr-only">
              Filter this list
            </label>
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
            <input
              id="orders-filter"
              type="search"
              value={text}
              placeholder="Filter this list"
              onChange={(e) => {
                setText(e.target.value);
                setParams({ q: e.target.value });
              }}
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate">
            From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setParams({ from: e.target.value })} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate">
            To
            <input type="date" value={to} min={from || undefined} onChange={(e) => setParams({ to: e.target.value })} className={inputClass} />
          </label>
          {(q || from || to) && (
            <button type="button" onClick={() => setParams({ q: "", from: "", to: "" })} className="h-9 rounded-lg px-2 text-sm font-semibold text-blue hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={status === "all" ? "No orders match" : `No ${STATUS_LABELS[status as OrderStatus].toLowerCase()} orders`}
            text={q || from || to ? "Try another search or change the dates." : "New orders will show up here."}
          />
        ) : (
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Orders</caption>
            <thead className={tableHead}>
              <tr>
                <th scope="col" className="w-[200px] px-4 py-2.5">Ref no.</th>
                <th scope="col" className="px-4 py-2.5">Customer</th>
                <th scope="col" className="w-[70px] px-4 py-2.5">Items</th>
                <th scope="col" className="w-[110px] px-4 py-2.5 text-right">Total</th>
                <th scope="col" className="w-[180px] px-4 py-2.5">Status</th>
                <th scope="col" className="w-[150px] px-4 py-2.5">Date</th>
                <th scope="col" className="w-10"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((o) => (
                <tr
                  key={o.ref}
                  onClick={() => router.push(`/staff/orders/${o.ref}`)}
                  className="cursor-pointer border-t border-border transition-colors duration-150 hover:bg-row-hover"
                >
                  <td className="px-4 py-3">
                    {/* The link makes each row reachable with the keyboard */}
                    <Link href={`/staff/orders/${o.ref}`} className="tabular font-semibold text-blue hover:underline" onClick={(e) => e.stopPropagation()}>
                      {o.ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{o.customer.name}</td>
                  <td className="px-4 py-3">{o.items.length}</td>
                  <td className="tabular px-4 py-3 text-right">{formatPeso(amountDue(o))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate">{formatDateTime(o.createdAt)}</td>
                  <td className="px-2 text-slate">
                    <ChevronRight size={16} aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPage={(p) => setParams({ page: String(p) })} />
      </div>
    </>
  );
}

// Loading state: grey bars shaped like the table rows
export function OrdersSkeleton() {
  const widths = ["w-40", "w-28", "w-44", "w-36"];
  return (
    <div aria-busy="true" aria-label="Loading orders" className="overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="h-11 border-b border-border" />
      <div className="h-[58px] border-b border-border" />
      <div className="h-9 bg-row-hover" />
      {widths.map((w, i) => (
        <div key={i} className="grid animate-pulse grid-cols-[200px_minmax(0,1fr)_70px_110px_180px_150px] items-center gap-4 border-t border-border px-4 py-3.5">
          <span className="h-3 w-36 rounded bg-[#e8edf4]" />
          <span className={`h-3 ${w} rounded bg-[#e8edf4]`} />
          <span className="h-3 w-5 rounded bg-[#e8edf4]" />
          <span className="h-3 w-16 justify-self-end rounded bg-[#e8edf4]" />
          <span className="h-5 w-28 rounded-full bg-[#e8edf4]" />
          <span className="h-3 w-24 rounded bg-[#e8edf4]" />
        </div>
      ))}
    </div>
  );
}
