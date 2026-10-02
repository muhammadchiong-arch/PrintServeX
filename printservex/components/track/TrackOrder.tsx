"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { findOrder } from "@/lib/customer-orders";
import { useIsClient } from "@/lib/use-is-client";
import { SHOP } from "@/lib/shop";
import { OrderStatusView } from "./OrderStatusView";

/**
 * /track            → C4 form
 * /track?ref=…&code=1953 → looks up the order and shows C5 (or the form with an error)
 * Keeping the lookup in the URL means a refresh keeps the status page open.
 */
export function TrackOrder() {
  const params = useSearchParams();
  const router = useRouter();
  const urlRef = params.get("ref") ?? "";
  const urlCode = params.get("code") ?? "";

  const [ref, setRef] = useState(urlRef);
  const [code, setCode] = useState(urlCode);
  const [formatError, setFormatError] = useState(false);
  const isClient = useIsClient();

  // Orders placed in this browser are kept in sessionStorage, which only exists in the browser
  if (urlRef && urlCode && !isClient) return <div aria-busy="true" className="h-96 animate-pulse rounded-xl bg-surface" />;
  const result = urlRef && urlCode ? findOrder(urlRef, urlCode) : null;
  if (result?.ok) return <OrderStatusView order={result.order} />;

  const notFound = result && !result.ok;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = findOrder(ref, code);
    if (!check.ok && check.error === "format") {
      setFormatError(true);
      return;
    }
    setFormatError(false);
    router.push(`/track?ref=${encodeURIComponent(ref.trim().toUpperCase())}&code=${code.replace(/\D/g, "")}`);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-[-0.015em]">Track your order</h1>
        <p className="text-slate">Enter the reference number from your confirmation page.</p>
      </div>

      {notFound && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <SearchX size={20} aria-hidden className="shrink-0" />
          <span>
            <b>No matching order.</b> Check both entries and try again, or call the shop at {SHOP.phone}.
          </span>
        </p>
      )}

      <Input
        label="Reference number"
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="PSX-20261001-0042"
        autoCapitalize="characters"
        autoComplete="off"
        className="tracking-[0.02em]"
        error={formatError && !/^PSX-\d{8}-\d{4}$/i.test(ref.trim()) ? "Use the format PSX-YYYYMMDD-0000" : undefined}
        invalid={Boolean(notFound)}
      />
      <div className="max-w-40">
        <Input
          label="Last 4 digits of contact number"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="1953"
          className="tracking-[0.2em]"
          error={formatError && code.length !== 4 ? "Enter 4 digits" : undefined}
          invalid={Boolean(notFound)}
        />
      </div>
      <Button type="submit" className="active:scale-[0.97]">
        Check status
      </Button>
    </form>
  );
}
