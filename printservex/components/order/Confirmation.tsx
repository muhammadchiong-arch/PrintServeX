"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, Check, CircleAlert, Copy, Store } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { getSavedOrder } from "@/lib/customer-orders";
import { formatPeso } from "@/lib/format";
import { amountDue, REF_PATTERN } from "@/lib/orders";
import { useShop } from "@/components/ShopProvider";
import { useIsClient } from "@/lib/use-is-client";

// Small header with only the logo, so the customer focuses on the reference number
function LogoHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[560px] items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-lg" aria-label="PrintServeX home">
          <Image src="/app-icon.png" alt="" width={32} height={32} className="size-8" />
          <span className="font-heading text-lg font-semibold">
            PrintServe<span className="text-blue">X</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export function Confirmation() {
  const shop = useShop();
  const ref = useSearchParams().get("ref") ?? "";
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useToast();

  // The order was saved in this browser by the form (sessionStorage), so read it once in the browser
  const isClient = useIsClient();
  const order = isClient ? getSavedOrder(ref) : undefined;
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      toast({ message: "Reference number copied" });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      toast({ kind: "error", message: "Couldn't copy. Please write the number down." });
    }
  };

  // Wrong or missing number in the link
  if (!REF_PATTERN.test(ref)) {
    return (
      <div className="min-h-dvh">
        <LogoHeader />
        <main id="main" className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-4 py-16 text-center">
          <CircleAlert size={32} aria-hidden className="text-cancelled" />
          <h1 className="text-2xl">We couldn&apos;t find this order</h1>
          <p className="text-slate">The link is missing a reference number. You can look up your order on the tracking page.</p>
          <Link href="/track" className={buttonClasses("primary", "lg")}>
            Track an order
          </Link>
        </main>
      </div>
    );
  }

  const last4 = order?.customer.phone.slice(-4);

  return (
    <div className="min-h-dvh">
      <LogoHeader />
      <main id="main" className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pb-12 pt-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-completed-tint text-completed">
            <Check size={28} strokeWidth={2.5} aria-hidden />
          </span>
          <h1 className="text-2xl tracking-[-0.015em]">Order received</h1>
          <p className="text-pretty text-slate">We&apos;ll start printing soon. Keep this number to check your status.</p>
        </div>

        <Card className="flex flex-col items-center gap-4 px-4 py-6">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">Reference number</span>
          <span className="tabular break-all text-center font-heading text-[28px] font-semibold leading-9 tracking-[0.03em]">{ref}</span>
          <button
            type="button"
            onClick={copy}
            className={cn(
              buttonClasses("secondary", "lg", "w-full"),
              copied && "border-completed bg-completed-tint text-completed hover:bg-completed-tint",
            )}
          >
            {copied ? <Check size={20} aria-hidden className="transition-[opacity,scale] duration-150 ease-snap starting:scale-90 starting:opacity-0" /> : <Copy size={20} aria-hidden />}
            {copied ? "Copied" : "Copy number"}
          </button>
        </Card>

        <p className="flex gap-2 rounded-lg bg-[#fff8e1] p-3 text-sm text-[#7a4a00]">
          <Camera size={20} aria-hidden className="shrink-0" />
          Save a screenshot of this page. You&apos;ll need the number and your contact number to track the order.
        </p>

        <div className="flex flex-col gap-1 px-1 text-sm text-slate">
          {order && (
            <span className="flex items-center gap-1.5 font-semibold text-navy">
              <Store size={18} aria-hidden />
              Estimated total {formatPeso(amountDue(order))} · pay at pickup
            </span>
          )}
          <span>
            {shop.address}, {shop.area} · {shop.hours}
          </span>
        </div>

        <Link
          href={last4 ? `/track?ref=${ref}&code=${last4}` : `/track?ref=${ref}`}
          className={buttonClasses("primary", "lg", "mt-4")}
        >
          Track this order
        </Link>
      </main>
    </div>
  );
}
