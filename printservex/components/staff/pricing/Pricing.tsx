"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, CircleCheck, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ADD_ONS } from "@/lib/add-ons";
import { cn } from "@/lib/cn";
import { formatPeso } from "@/lib/format";
import { findRate, type PriceRule } from "@/lib/price";
import type { PricingData } from "@/lib/pricing-data";
import { PageTitle, tableHead } from "../parts";
import { OptionModal, type OptionKind, type OptionRow } from "./OptionModal";

type Tab = "sizes" | "papers" | "matrix" | "addons";

const ADD_LABEL: Record<Exclude<Tab, "matrix">, string> = { sizes: "Add size", papers: "Add paper type", addons: "Add add-on" };
const DETAIL_COL: Record<Exclude<Tab, "matrix">, string> = { sizes: "Dimensions", papers: "Available sizes", addons: "Price" };

// "A4 (8.27 × 11.69 in)" → "8.27 × 11.69 in"
const dims = (label: string) => label.match(/\((.*)\)$/)?.[1] ?? "—";

// S9. Business rule: options are archived, never deleted, so old orders keep their details.
export function Pricing({ data }: { data: PricingData }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("matrix");
  const [rows, setRows] = useState<Record<Exclude<Tab, "matrix">, OptionRow[]>>(() => ({
    sizes: data.sizes.map((s) => ({ name: s.name, detail: dims(s.label), archived: false })),
    papers: data.types.map((t) => ({
      name: t.name,
      detail: data.sizes.filter((s) => data.rules.some((r) => r.typeId === t.id && r.sizeId === s.id)).map((s) => s.name).join(", ") || "—",
      archived: false,
    })),
    addons: Object.values(ADD_ONS).map((a) => ({ name: a.label, detail: `${formatPeso(a.price)} ${a.unit}`, archived: false })),
  }));
  const [editing, setEditing] = useState<{ kind: OptionKind; index: number | null } | null>(null);

  // Price per page grid for the chosen paper type, kept as text while typing
  const [typeId, setTypeId] = useState(data.types[0]?.id ?? "");
  const [rules, setRules] = useState<PriceRule[]>(data.rules);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const cellKey = (sizeId: string, color: boolean) => `${sizeId}|${typeId}|${color ? "c" : "b"}`;
  const cellValue = (sizeId: string, color: boolean) => draft[cellKey(sizeId, color)] ?? findRate(rules, { sizeId, typeId, color })?.toFixed(2) ?? "";
  const dirty = Object.keys(draft).length > 0;
  const invalid = Object.values(draft).some((v) => v !== "" && !(Number(v) >= 0));

  const savePrices = () => {
    const next = [...rules];
    for (const [key, text] of Object.entries(draft)) {
      const [sizeId, tId, c] = key.split("|");
      const color = c === "c";
      const i = next.findIndex((r) => r.sizeId === sizeId && r.typeId === tId && r.color === color);
      if (text === "") {
        if (i >= 0) next.splice(i, 1); // empty = this combination is not offered
      } else if (i >= 0) next[i] = { ...next[i], pricePerPage: Number(text) };
      else next.push({ sizeId, typeId: tId, color, pricePerPage: Number(text) });
    }
    setRules(next);
    setDraft({});
    toast({ message: "Changed on this page only. Saving prices to the database comes in the next step." });
  };

  const toggleArchive = (kind: Exclude<Tab, "matrix">, index: number) => {
    const row = rows[kind][index];
    setRows({ ...rows, [kind]: rows[kind].map((r, i) => (i === index ? { ...r, archived: !r.archived } : r)) });
    toast({ message: row.archived ? `${row.name} restored.` : `${row.name} archived. Past orders keep it.` });
  };

  return (
    <>
      <PageTitle actions={<span className="text-[13px] text-slate">Changes apply to new orders only. Existing orders keep their price.</span>}>
        Pricing &amp; options
      </PageTitle>

      <p className="flex items-center gap-2 rounded-lg border border-dashed border-[#b9c6da] px-3 py-2 text-sm text-slate">
        <Info size={16} aria-hidden className="shrink-0" />
        Prices are loaded from Supabase. Edits on this page aren&apos;t saved to the database yet.
      </p>

      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <div className="flex items-center border-b border-border pr-4">
          <Tabs
            label="Pricing sections"
            value={tab}
            onChange={setTab}
            className="flex-1"
            bordered={false}
            tabs={[
              { value: "sizes", label: "Paper sizes" },
              { value: "papers", label: "Paper types" },
              { value: "matrix", label: "Price per page" },
              { value: "addons", label: "Add-ons" },
            ]}
          />
          {tab !== "matrix" && (
            <Button size="md" className="h-8 px-2.5 text-[13px]" onClick={() => setEditing({ kind: tab, index: null })}>
              <Plus size={14} aria-hidden />
              {ADD_LABEL[tab]}
            </Button>
          )}
        </div>

        {tab === "matrix" ? (
          <>
            <div className="flex items-end gap-3 p-4">
              <div className="w-60">
                <Select size="md" label="Paper type" value={typeId} onChange={(e) => setTypeId(e.target.value)} options={data.types.map((t) => ({ value: t.id, label: t.name }))} />
              </div>
              <span className="pb-2 text-sm text-slate">Price per page in ₱. Leave empty if you don&apos;t offer it.</span>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className={tableHead}>
                <tr className="border-t border-border">
                  <th scope="col" className="w-[260px] px-4 py-2.5">Size</th>
                  <th scope="col" className="w-[200px] px-4 py-2.5">B&amp;W</th>
                  <th scope="col" className="px-4 py-2.5">Color</th>
                </tr>
              </thead>
              <tbody>
                {data.sizes.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                      {s.label}
                    </th>
                    {[false, true].map((color) => (
                      <td key={String(color)} className="px-4 py-2.5">
                        <label className="flex h-9 w-[120px] items-center gap-1 rounded-lg border border-border px-2.5 focus-within:border-blue focus-within:ring-[3px] focus-within:ring-blue/20">
                          <span className="text-slate">₱</span>
                          <span className="sr-only">
                            {s.name} {color ? "color" : "black and white"} price per page
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.25"
                            inputMode="decimal"
                            value={cellValue(s.id, color)}
                            onChange={(e) => setDraft({ ...draft, [cellKey(s.id, color)]: e.target.value })}
                            className="tabular w-full bg-transparent outline-none"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button size="md" variant="secondary" disabled={!dirty} onClick={() => setDraft({})}>
                Discard
              </Button>
              <Button size="md" disabled={!dirty || invalid} onClick={savePrices}>
                Save prices
              </Button>
            </div>
          </>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className={tableHead}>
              <tr>
                <th scope="col" className="px-4 py-2.5">Name</th>
                <th scope="col" className="w-[220px] px-4 py-2.5">{DETAIL_COL[tab]}</th>
                <th scope="col" className="w-[140px] px-4 py-2.5">Status</th>
                <th scope="col" className="w-[180px] px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows[tab].map((r, i) => (
                <tr key={r.name} className={cn("border-t border-border", r.archived && "text-slate")}>
                  <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                  <td className="px-4 py-2.5">{r.detail}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      {r.archived ? <Archive size={12} aria-hidden /> : <CircleCheck size={12} aria-hidden className="text-completed" />}
                      {r.archived ? "Archived" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" onClick={() => setEditing({ kind: tab, index: i })}>
                        Edit<span className="sr-only"> {r.name}</span>
                      </Button>
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" onClick={() => toggleArchive(tab, i)}>
                        {r.archived ? <ArchiveRestore size={14} aria-hidden /> : <Archive size={14} aria-hidden />}
                        {r.archived ? "Restore" : "Archive"}
                        <span className="sr-only"> {r.name}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <OptionModal
          kind={editing.kind}
          row={editing.index === null ? null : rows[editing.kind][editing.index]}
          onClose={() => setEditing(null)}
          onSave={(row) => {
            const list = rows[editing.kind];
            const next = editing.index === null ? [...list, row] : list.map((r, i) => (i === editing.index ? row : r));
            setRows({ ...rows, [editing.kind]: next });
            toast({ message: `${row.name} saved.` });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
