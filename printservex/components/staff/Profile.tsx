"use client";

import { useState } from "react";
import { Circle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { PageTitle } from "./parts";
import { useStaff } from "./StaffStore";

// Business rule: passwords need at least 10 characters and a number
const strongEnough = (p: string) => p.length >= 10 && /\d/.test(p);

// S13: change your own password (Supabase Auth later: supabase.auth.updateUser)
export function Profile() {
  const { me, log } = useStaff();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const ruleOk = strongEnough(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsOld = next.length > 0 && next === cur;
  const canSave = Boolean(cur) && ruleOk && confirm === next && !sameAsOld;
  const initials = me.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <>
      <PageTitle>Profile</PageTitle>
      <form
        className="flex w-[480px] max-w-full flex-col gap-4 rounded-xl bg-surface p-6 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          setCur("");
          setNext("");
          setConfirm("");
          log("Password changed", me.name);
          toast({ message: "Password updated." });
        }}
      >
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-processing-tint font-semibold text-blue-hover">{initials}</span>
          <div className="flex flex-col">
            <span className="font-semibold">{me.name}</span>
            <span className="text-sm text-slate">
              {me.username} · {me.role}
            </span>
          </div>
        </div>
        <h2 className="text-base">Change password</h2>
        <Input size="md" label="Current password" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <Input
            size="md"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={sameAsOld ? "Choose a password different from the current one." : undefined}
          />
          {/* Checked as you type; icon + text, so it doesn't rely on color */}
          <p className={cn("flex items-center gap-1 text-xs", ruleOk ? "text-completed" : "text-slate")}>
            {ruleOk ? <CircleCheck size={12} aria-hidden /> : <Circle size={12} aria-hidden />}
            At least 10 characters, with a number
          </p>
        </div>
        <Input
          size="md"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Passwords don't match." : undefined}
        />
        <Button type="submit" size="md" disabled={!canSave} className="self-start">
          Update password
        </Button>
      </form>
    </>
  );
}
