"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { saveService } from "@/lib/admin-actions";
import { cn } from "@/lib/cn";
import type { PricingData } from "@/lib/pricing-data";
import type { Service } from "@/lib/services";
import { tableHead } from "../parts";

const NO_SERVER = "We couldn't reach the server. Check your connection and try again.";

// One service: its price box saves on its own
function ServiceRow({ service }: { service: Service }) {
  const router = useRouter();
  const toast = useToast();
  const saved = service.unitPrice === null ? "" : service.unitPrice.toFixed(2);
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const value = text.trim() === "" ? null : Number(text);
  const valid = value === null || (Number.isFinite(value) && value >= 0);
  const changed = text.trim() !== saved;

  const save = async (unitPrice: number | null, active: boolean, message: string) => {
    setBusy(true);
    const result = await saveService(service.id, unitPrice, active).catch(() => null);
    setBusy(false);
    if (!result?.ok) return toast({ kind: "error", message: result?.error ?? NO_SERVER });
    toast({ message });
    router.refresh();
  };

  return (
    <tr className={cn("border-t border-border", !service.active && "text-slate")}>
      <td className="px-4 py-2.5">
        <span className="font-semibold">{service.name}</span>
        {!service.active && <span className="ml-2 text-xs">Archived</span>}
      </td>
      <td className="px-4 py-2.5">
        {service.kind === "document" ? (
          <span className="text-slate">Price per page tab</span>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!changed || !valid || busy) return;
              void save(value === null ? null : Math.round(value * 100) / 100, service.active, value === null ? `${service.name}: price to be confirmed by staff.` : `${service.name} price saved. New orders use it.`);
            }}
          >
            <label className="flex h-9 w-[130px] items-center gap-1 rounded-lg border border-border px-2.5 focus-within:border-blue focus-within:ring-[3px] focus-within:ring-blue/20">
              <span className="text-slate">₱</span>
              <span className="sr-only">{service.name} price {service.unitLabel}</span>
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
            <span className="whitespace-nowrap text-xs text-slate">{service.unitLabel}</span>
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
          onClick={() => save(service.unitPrice, !service.active, service.active ? `${service.name} archived. Customers can't choose it.` : `${service.name} restored.`)}
        >
          {service.active ? <Archive size={14} aria-hidden /> : <ArchiveRestore size={14} aria-hidden />}
          {service.active ? "Archive" : "Restore"}
          <span className="sr-only"> {service.name}</span>
        </Button>
      </td>
    </tr>
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
                <ServiceRow key={`${s.id}-${s.unitPrice}-${s.active}`} service={s} />
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
