"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { savePhotoSize, saveService } from "@/lib/admin-actions";
import { cn } from "@/lib/cn";
import type { PricingData } from "@/lib/pricing-data";
import type { Service } from "@/lib/services";
import { tableHead } from "../parts";

const NO_SERVER = "We couldn't reach the server. Check your connection and try again.";

type SaveResult = { ok: boolean; error?: string } | null;

// One row with a price box that saves on its own, and Archive / Restore.
// Used for each service, and for each Photo Printing size.
function PriceRow({
  name,
  unitLabel,
  price,
  active,
  indent = false,
  fixedText,
  onSave,
}: {
  name: string;
  unitLabel: string;
  price: number | null; // null = to be confirmed
  active: boolean;
  indent?: boolean; // a size under its service
  fixedText?: string; // shown instead of a price box (priced elsewhere)
  onSave: (price: number | null, active: boolean) => Promise<SaveResult>;
}) {
  const router = useRouter();
  const toast = useToast();
  const saved = price === null ? "" : price.toFixed(2);
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const value = text.trim() === "" ? null : Number(text);
  const valid = value === null || (Number.isFinite(value) && value >= 0);
  const changed = text.trim() !== saved;

  const save = async (newPrice: number | null, newActive: boolean, message: string) => {
    setBusy(true);
    const result = await onSave(newPrice, newActive).catch(() => null);
    setBusy(false);
    if (!result?.ok) return toast({ kind: "error", message: result?.error ?? NO_SERVER });
    toast({ message });
    router.refresh();
  };

  return (
    <tr className={cn("border-t border-border", !active && "text-slate")}>
      <td className={cn("px-4 py-2.5", indent && "pl-10")}>
        <span className={indent ? "" : "font-semibold"}>{name}</span>
        {!active && <span className="ml-2 text-xs">Archived</span>}
      </td>
      <td className="px-4 py-2.5">
        {fixedText ? (
          <span className="text-slate">{fixedText}</span>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!changed || !valid || busy) return;
              void save(value === null ? null : Math.round(value * 100) / 100, active, value === null ? `${name}: price to be confirmed by staff.` : `${name} price saved. New orders use it.`);
            }}
          >
            <label className="flex h-9 w-[130px] items-center gap-1 rounded-lg border border-border px-2.5 focus-within:border-blue focus-within:ring-[3px] focus-within:ring-blue/20">
              <span className="text-slate">₱</span>
              <span className="sr-only">{name} price {unitLabel}</span>
              <input
                type="number"
                min={0}
                step="0.25"
                inputMode="decimal"
                placeholder="To confirm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="tabular w-full bg-transparent outline-none placeholder:text-xs"
              />
            </label>
            <span className="whitespace-nowrap text-xs text-slate">{unitLabel}</span>
            {changed && (
              <Button type="submit" size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" disabled={!valid || busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            )}
          </form>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button
          size="md"
          variant="secondary"
          className="h-8 px-2.5 text-[13px]"
          disabled={busy}
          onClick={() => save(price, !active, active ? `${name} archived. Customers can't choose it.` : `${name} restored.`)}
        >
          {active ? <Archive size={14} aria-hidden /> : <ArchiveRestore size={14} aria-hidden />}
          {active ? "Archive" : "Restore"}
          <span className="sr-only"> {name}</span>
        </Button>
      </td>
    </tr>
  );
}

function ServiceRow({ service }: { service: Service }) {
  return (
    <PriceRow
      name={service.name}
      unitLabel={service.unitLabel}
      price={service.unitPrice}
      active={service.active}
      fixedText={service.kind === "document" ? "Price per page tab" : service.defaults.printSizes ? "Price per photo size below" : undefined}
      onSave={(price, active) => saveService(service.id, price, active)}
    />
  );
}

// S9 → Services: the price of every service, by category.
// Business rule: an empty price = "Price to be confirmed by staff" on the order (never a made-up price).
export function ServicesTab({ data }: { data: PricingData }) {
  return (
    <div>
      <p className="border-t border-border px-4 py-3 text-sm text-slate">
        Leave a price empty if it changes per job: customers see &quot;Price to be confirmed&quot; and you set it as the final price. Large-format prices are per square foot.
      </p>
      {data.categories.map((c) => {
        const services = data.services.filter((s) => s.categoryKey === c.key);
        if (services.length === 0) return null;
        return (
          <table key={c.key} className="w-full border-collapse text-sm">
            <caption className="border-t border-border bg-row-hover px-4 py-2 text-left font-sans text-xs font-semibold uppercase tracking-[0.04em] text-slate">{c.name}</caption>
            <thead className={cn(tableHead, "sr-only")}>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Price</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <Fragment key={`${s.id}-${s.unitPrice}-${s.active}`}>
                  <ServiceRow service={s} />
                  {/* Photo Printing: one price per photo size (Wallet, 3R, 4R…) */}
                  {s.defaults.printSizes &&
                    data.photoSizes.map((p) => (
                      <PriceRow
                        key={`${p.key}-${p.price}-${p.active}`}
                        indent
                        name={`${p.label} · ${p.widthIn} × ${p.heightIn} in`}
                        unitLabel="per print"
                        price={p.price}
                        active={p.active}
                        onSave={(price, active) => savePhotoSize(p.key, price, active)}
                      />
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
