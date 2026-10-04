"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CircleCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { saveAddOn, saveLaminationPrices, saveOption, savePrices as savePricesOnServer, setOptionActive, type PriceCell } from "@/lib/admin-actions";
import { cn } from "@/lib/cn";
import { formatPeso } from "@/lib/format";
import { findRate, LAMINATION_SIZE_IDS, type AddOnKey, type LaminationSize } from "@/lib/price";
import type { PricingData } from "@/lib/pricing-data";
import { PageTitle, tableHead } from "../parts";
import { OptionModal, type OptionDraft, type OptionKind } from "./OptionModal";
import { ServicesTab } from "./ServicesTab";

type Tab = "sizes" | "papers" | "matrix" | "addons" | "services";
// One row on the Paper sizes / Paper types / Add-ons tabs
type Row = { id: string; name: string; detail: string; archived: boolean; draft: OptionDraft };
type Result = { ok: true } | { ok: false; error: string } | null;

// Add-ons can't be added: the price math only knows binding and lamination
const ADD_LABEL = { sizes: "Add size", papers: "Add paper type" } as const;
const DETAIL_COL: Record<OptionKind, string> = { sizes: "Dimensions", papers: "Available sizes", addons: "Price" };
const ARCHIVE_KIND = { sizes: "size", papers: "type", addons: "addon" } as const;
const NO_SERVER = "We couldn't reach the server. Check your connection and try again.";

// S9 (admin only). Shows the real options from Supabase, archived ones too.
// Every change is saved on the server (lib/admin-actions.ts), then the page reloads its data.
// Business rule: options are archived, never deleted, so old orders keep their details.
export function Pricing({ data }: { data: PricingData }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("matrix");
  const [editing, setEditing] = useState<{ kind: OptionKind; row: Row | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeSizes = data.sizes.filter((s) => s.active);
  const activeTypes = data.types.filter((t) => t.active);
  const blank: OptionDraft = { name: "", dimensions: "", price: "", unit: "" };
  // Business rule: lamination is priced by its size (ID, Short, A4, Legal), set here by the admin
  const laminationText = `${data.laminationPrices.map((l) => `${l.label} ${formatPeso(l.price)}`).join(" · ")} per sheet`;
  const laminationDraft = Object.fromEntries(data.laminationPrices.map((l) => [l.id, l.price.toFixed(2)])) as Record<LaminationSize, string>;
  const rows: Record<OptionKind, Row[]> = {
    sizes: data.sizes.map((s) => ({ id: s.id, name: s.name, detail: s.dimensions || "—", archived: !s.active, draft: { ...blank, name: s.name, dimensions: s.dimensions } })),
    papers: data.types.map((t) => ({
      id: t.id,
      name: t.name,
      detail: activeSizes.filter((s) => data.rules.some((r) => r.typeId === t.id && r.sizeId === s.id)).map((s) => s.name).join(", ") || "—",
      archived: !t.active,
      draft: { ...blank, name: t.name },
    })),
    addons: data.addOnList.map((a) => ({
      id: a.key,
      name: a.label,
      detail: a.key === "lamination" ? laminationText : `${formatPeso(a.price)} ${a.unit}`,
      archived: !a.active,
      draft: { ...blank, name: a.label, price: a.price.toFixed(2), unit: a.unit, laminationPrices: a.key === "lamination" ? laminationDraft : undefined },
    })),
  };

  // Shows the result of a server action, then reloads the data. true = saved.
  const done = (result: Result, message: string) => {
    if (!result?.ok) {
      toast({ kind: "error", message: result?.error ?? NO_SERVER });
      return false;
    }
    toast({ message });
    router.refresh();
    return true;
  };

  // Price per page grid for the chosen paper type, kept as text while typing
  const [typeId, setTypeId] = useState(activeTypes[0]?.id ?? "");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const cellKey = (sizeId: string, color: boolean) => `${sizeId}|${color ? "c" : "b"}`;
  const cellValue = (sizeId: string, color: boolean) => draft[cellKey(sizeId, color)] ?? findRate(data.rules, { sizeId, typeId, color })?.toFixed(2) ?? "";
  const dirty = Object.keys(draft).length > 0;
  const invalid = Object.values(draft).some((v) => v !== "" && !(Number(v) >= 0));

  const savePrices = async () => {
    // Empty = this combination is not offered
    const cells: PriceCell[] = Object.entries(draft).map(([key, text]) => {
      const [sizeId, c] = key.split("|");
      return { sizeId, color: c === "c", price: text === "" ? null : Number(text) };
    });
    setSaving(true);
    const result = await savePricesOnServer(typeId, cells).catch(() => null);
    setSaving(false);
    if (done(result, "Prices saved. New orders use the new prices; existing orders keep theirs.")) setDraft({});
  };

  const toggleArchive = async (kind: OptionKind, row: Row) => {
    setBusyId(row.id);
    const result = await setOptionActive(ARCHIVE_KIND[kind], row.id, row.archived).catch(() => null);
    setBusyId(null);
    done(result, row.archived ? `${row.name} restored.` : `${row.name} archived. Past orders keep it.`);
  };

  const saveRow = async (kind: OptionKind, row: Row | null, f: OptionDraft) => {
    let result: Result;
    if (kind === "addons") {
      if (!row) return false;
      if (f.laminationPrices) {
        // Lamination: save the four size prices (the database also keeps the cheapest in add_ons),
        // then the name, only if it changed
        const prices = Object.fromEntries(LAMINATION_SIZE_IDS.map((id) => [id, Number(f.laminationPrices![id])])) as Record<LaminationSize, number>;
        result = await saveLaminationPrices(prices).catch(() => null);
        if (result?.ok && f.name !== row.name) {
          const renamed = await saveAddOn(row.id as AddOnKey, f.name, Math.min(...Object.values(prices)), f.unit || "per sheet").catch(() => null);
          if (!renamed?.ok) {
            toast({ kind: "error", message: "Lamination prices saved, but the new name wasn't. Please try the name again." });
            router.refresh();
            return false;
          }
        }
      } else {
        result = await saveAddOn(row.id as AddOnKey, f.name, Number(f.price), f.unit).catch(() => null);
      }
    } else {
      result = await saveOption(kind === "sizes" ? "size" : "type", row?.id ?? null, f.name, f.dimensions).catch(() => null);
    }
    return done(result, `${f.name} saved.`);
  };

  return (
    <>
      <PageTitle actions={<span className="text-[13px] text-slate">Changes apply to new orders only. Existing orders keep their price.</span>}>
        Pricing &amp; options
      </PageTitle>

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
              { value: "services", label: "Services" },
            ]}
          />
          {(tab === "sizes" || tab === "papers") && (
            <Button size="md" className="h-8 px-2.5 text-[13px]" onClick={() => setEditing({ kind: tab, row: null })}>
              <Plus size={14} aria-hidden />
              {ADD_LABEL[tab]}
            </Button>
          )}
        </div>

        {tab === "services" ? (
          <ServicesTab data={data} />
        ) : tab === "matrix" ? (
          <>
            <div className="flex items-end gap-3 p-4">
              <div className="w-60">
                <Select size="md" label="Paper type" value={typeId} onChange={(e) => {
                    setTypeId(e.target.value);
                    setDraft({}); // unsaved prices belong to the previous paper type
                  }} options={activeTypes.map((t) => ({ value: t.id, label: t.name }))} />
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
                {activeSizes.map((s) => (
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
              <Button size="md" disabled={!dirty || invalid || saving} onClick={savePrices}>
                {saving ? "Saving…" : "Save prices"}
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
              {rows[tab].length === 0 && (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-4 py-6 text-center text-slate">
                    Nothing here yet.
                  </td>
                </tr>
              )}
              {rows[tab].map((r) => (
                <tr key={r.id} className={cn("border-t border-border", r.archived && "text-slate")}>
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
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" onClick={() => setEditing({ kind: tab, row: r })}>
                        Edit<span className="sr-only"> {r.name}</span>
                      </Button>
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" disabled={busyId === r.id} onClick={() => toggleArchive(tab, r)}>
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
          initial={editing.row?.draft ?? null}
          onClose={() => setEditing(null)}
          onSave={(f) => saveRow(editing.kind, editing.row, f)}
        />
      )}
    </>
  );
}
