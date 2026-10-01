"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import type { CustomerDetails, DetailsErrors } from "@/lib/order-details";

type DetailsStepProps = {
  details: CustomerDetails;
  errors: DetailsErrors; // only filled after the customer presses Continue
  onChange: (patch: Partial<CustomerDetails>) => void;
};

// Step 1: name, contact number, optional email, privacy consent
export function DetailsStep({ details, errors, onChange }: DetailsStepProps) {
  return (
    <div className="flex flex-col gap-5 lg:max-w-[560px]">
      <p className="-mt-3 text-sm text-slate">We only use these to tell you when your order is ready.</p>
      <Input
        id="name"
        label="Full name"
        autoComplete="name"
        value={details.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
        placeholder="Juan Dela Cruz"
      />
      <Input
        id="phone"
        label="Contact number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={details.phone}
        onChange={(e) => onChange({ phone: e.target.value })}
        error={errors.phone}
        hint="You'll need the last 4 digits to track your order."
        placeholder="0917 482 1953"
      />
      <Input
        id="email"
        label="Email (optional)"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={details.email}
        onChange={(e) => onChange({ email: e.target.value })}
        error={errors.email}
        placeholder="juan.delacruz@gmail.com"
      />
      <Checkbox checked={details.consent} onChange={(consent) => onChange({ consent })} error={errors.consent}>
        I agree that PrintServeX may keep my details and files for 30 days to process this order.{" "}
        <Link href="/privacy" target="_blank" className="font-medium text-blue underline-offset-2 hover:underline">
          Privacy notice
        </Link>
      </Checkbox>
    </div>
  );
}
