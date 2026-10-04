"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDuration, formatPeso, toDayKey } from "@/lib/format";
import { amountDue, type Order } from "@/lib/orders";
import type { InventoryItem } from "@/lib/staff-types";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/status";
import { PageTitle } from "./parts";
import { useStaff } from "./StaffStore";

type ReportType = "Sales" | "Orders" | "Inventory";
type Report = { title: string; kpis: [string, string][]; cols: string[]; rows: string[][] };

const inRange = (iso: string, from: string, to: string) => {
  const d = toDayKey(iso);
  return d >= from && d <= to;
};
const average = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

function salesReport(orders: Order[], from: string, to: string): Report {
  const paid = orders.filter((o) => o.payment && inRange(o.payment.at, from, to));
  const gross = paid.reduce((s, o) => s + (o.payment?.amount ?? 0), 0);
  const days = [...new Set(paid.map((o) => toDayKey(o.payment!.at)))].sort().reverse();
  const sum = (list: Order[], m: "cash" | "gcash") => list.filter((o) => o.payment?.method === m).reduce((s, o) => s + (o.payment?.amount ?? 0), 0);
  return {
    title: "Sales report",
    kpis: [
      ["Gross sales", formatPeso(gross)],
      ["Completed orders", String(paid.length)],
      ["Average order", formatPeso(paid.length ? gross / paid.length : 0)],
      ["Cancelled", String(orders.filter((o) => o.status === "cancelled" && inRange(o.createdAt, from, to)).length)],
    ],
    cols: ["Date", "Orders", "Cash", "Online payment"],
    rows: days.map((d) => {
      const list = paid.filter((o) => toDayKey(o.payment!.at) === d);
      return [formatDate(`${d}T12:00:00+08:00`), String(list.length), formatPeso(sum(list, "cash")), formatPeso(sum(list, "gcash"))];
    }),
  };
}

function ordersReport(orders: Order[], from: string, to: string): Report {
  const list = orders.filter((o) => inRange(o.createdAt, from, to));
  // Time from order received to Ready for Pickup
  const toReady = list.flatMap((o) => {
    const ready = o.history.find((h) => h.status === "ready");
    return ready ? [(Date.parse(ready.at) - Date.parse(o.createdAt)) / 60000] : [];
  });
  return {
    title: "Orders report",
    kpis: [
      ["Orders received", String(list.length)],
      ["Online", String(list.filter((o) => o.source === "online").length)],
      ["Walk-in", String(list.filter((o) => o.source === "walk-in").length)],
      ["Avg. time to ready", toReady.length ? formatDuration(average(toReady)) : "—"],
    ],
    cols: ["Status", "Count", "Share", "Avg. value"],
    rows: ORDER_STATUSES.map((s) => {
      const sub = list.filter((o) => o.status === s);
      return [STATUS_LABELS[s], String(sub.length), list.length ? `${((sub.length / list.length) * 100).toFixed(1)}%` : "0%", formatPeso(average(sub.map(amountDue)))];
    }),
  };
}

function inventoryReport(items: InventoryItem[], from: string, to: string): Report {
  const moves = items.flatMap((i) => i.moves.filter((m) => inRange(m.at, from, to)));
  return {
    title: "Inventory report",
    kpis: [
      ["Items tracked", String(items.length)],
      ["Below reorder", String(items.filter((i) => i.qty <= i.reorderLevel).length)],
      ["Stock in", `${moves.filter((m) => m.change > 0).length} movements`],
      ["Stock out", `${moves.filter((m) => m.change < 0).length} movements`],
    ],
    cols: ["Item", "Added", "Used", "On hand"],
    rows: items.map((i) => {
      const own = i.moves.filter((m) => inRange(m.at, from, to));
      const added = own.filter((m) => m.change > 0).reduce((s, m) => s + m.change, 0);
      const used = own.filter((m) => m.change < 0).reduce((s, m) => s - m.change, 0);
      return [i.name, `${added} ${i.unit}`, `${used} ${i.unit}`, `${i.qty} ${i.unit}`];
    }),
  };
}

// Builds a CSV file in the browser and downloads it (no server needed)
function downloadCsv(report: Report, from: string, to: string) {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [report.cols, ...report.rows].map((r) => r.map(esc).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); // ﻿ makes Excel read ₱ correctly
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `printservex-${report.title.split(" ")[0].toLowerCase()}-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const dateInput = "h-9 w-40 rounded-lg border border-border px-3 text-sm focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20";

// S10
export function Reports() {
  const { orders, inventory } = useStaff();
  const toast = useToast();
  const today = toDayKey(new Date().toISOString());
  const [type, setType] = useState<ReportType>("Sales");
  // Default range: the last 30 days
  const [from, setFrom] = useState(() => toDayKey(new Date(new Date().getTime() - 29 * 86_400_000).toISOString()));
  const [to, setTo] = useState(today);
  const badRange = !from || !to || from > to;

  const report = type === "Sales" ? salesReport(orders, from, to) : type === "Orders" ? ordersReport(orders, from, to) : inventoryReport(inventory, from, to);
  const rangeText = badRange ? "" : `${formatDate(`${from}T12:00:00+08:00`)} to ${formatDate(`${to}T12:00:00+08:00`)}`;

  return (
    <>
      <PageTitle>Reports</PageTitle>

      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-surface p-4 shadow-card print:hidden">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Report type</span>
          <Tabs
            variant="segmented"
            label="Report type"
            value={type}
            onChange={setType}
            tabs={(["Sales", "Orders", "Inventory"] as const).map((t) => ({ value: t, label: t }))}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={dateInput} />
        </label>
        <div className="ml-auto flex gap-2">
          <Button
            size="md"
            variant="secondary"
            disabled={badRange}
            onClick={() => {
              downloadCsv(report, from, to);
              toast({ message: `${report.title} exported as CSV.` });
            }}
          >
            <FileSpreadsheet size={16} aria-hidden />
            Export CSV
          </Button>
          {/* Opens the print window; choose "Save as PDF" there */}
          <Button size="md" disabled={badRange} onClick={() => window.print()}>
            <FileText size={16} aria-hidden />
            Export PDF
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-card print:shadow-none">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg">{report.title}</h2>
          <span className="text-[13px] text-slate">{badRange ? "Choose a valid date range" : `Preview · ${rangeText}`}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {report.kpis.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-lg border border-border px-4 py-3">
              <span className="text-xs text-slate">{k}</span>
              <span className="tabular font-heading text-[22px] font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-row-hover text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate">
              <tr>
                {report.cols.map((c) => (
                  <th key={c} scope="col" className="px-4 py-2.5">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={report.cols.length} className="px-4 py-8 text-center text-slate">
                    Nothing in this date range.
                  </td>
                </tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.join("|")} className="tabular border-t border-border">
                    {r.map((v, i) => (
                      <td key={i} className="px-4 py-2.5">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
