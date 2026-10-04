"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { REF_PATTERN } from "@/lib/orders";
import { useShop } from "@/components/ShopProvider";
import type { TrackResult } from "@/lib/track";
import { OrderStatusView } from "./OrderStatusView";

type TrackOrderProps = {
  // The server's answer for the ref + code in the URL (null = nothing searched yet)
  result: TrackResult | null;
  initialRef: string;
  initialCode: string;
};

/**
 * /track            → C4 form
 * /track?ref=…&code=1953 → the server looks up the order and this shows C5 (or the form with an error)
 * Keeping the lookup in the URL means a refresh keeps the status page open.
 */
export function TrackOrder({ result, initialRef, initialCode }: TrackOrderProps) {
  const shop = useShop();
  const router = useRouter();
  const [ref, setRef] = useState(initialRef);
  const [code, setCode] = useState(initialCode);
  const [formatError, setFormatError] = useState(false);
  // true while the server is looking up the order
  const [checking, startChecking] = useTransition();

  if (result?.ok) return <OrderStatusView order={result.order} />;

  const notFound = result?.ok === false && result.error !== "unavailable" && result.error !== "too_many";
  const tooMany = result?.ok === false && result.error === "too_many";
  const unavailable = result?.ok === false && result.error === "unavailable";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = ref.trim().toUpperCase();
    const cleanCode = code.replace(/\D/g, "");
    if (!REF_PATTERN.test(cleanRef) || cleanCode.length !== 4) {
      setFormatError(true);
      return;
    }
    setFormatError(false);
    // The page reloads with the new URL and the server does the lookup
    startChecking(() => router.push(`/track?ref=${encodeURIComponent(cleanRef)}&code=${cleanCode}`));
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
            <b>No matching order.</b> Check both entries and try again, or call the shop at {shop.phone}.
          </span>
        </p>
      )}
      {tooMany && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <SearchX size={20} aria-hidden className="shrink-0" />
          <span>
            <b>Too many tries for this reference number.</b> Please wait an hour and try again, or call the shop at {shop.phone}.
          </span>
        </p>
      )}
      {unavailable && (
        <p role="alert" className="flex gap-2 rounded-lg bg-cancelled-tint p-3 text-sm text-cancelled">
          <SearchX size={20} aria-hidden className="shrink-0" />
          <span>
            <b>We can&apos;t check orders right now.</b> Please try again in a few minutes, or call the shop at {shop.phone}.
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
      <Button type="submit" disabled={checking}>
        {checking ? "Checking…" : "Check status"}
      </Button>
    </form>
  );
}
