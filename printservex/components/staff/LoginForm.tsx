"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signIn } from "@/lib/staff-auth-actions";

// S1: signs in with Supabase Auth on the server (lib/staff-auth-actions.ts).
// `next` = the staff page to open after signing in (set by proxy.ts).
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [emptyError, setEmptyError] = useState("");
  const error = emptyError || state?.error || "";

  // Empty fields are caught here, before asking the server
  const check = (e: React.FormEvent) => {
    if (!username.trim() || !password) {
      e.preventDefault();
      setEmptyError("Enter your username and password.");
    } else {
      setEmptyError("");
    }
  };

  return (
    <form action={action} onSubmit={check} noValidate className="flex w-[400px] max-w-full flex-col gap-5 rounded-xl bg-surface p-8 shadow-card">
      <Image src="/logo-horizontal-color.png" alt="PrintServeX" width={2400} height={698} priority className="h-10 w-auto self-start" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl">Staff sign in</h1>
        <p className="text-sm text-slate">For shop staff only. Customers don&apos;t need an account.</p>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-cancelled-tint px-3 py-2.5 text-sm text-cancelled">
          <CircleAlert size={18} aria-hidden className="shrink-0" />
          {error}
        </p>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <Input size="md" label="Username" name="username" autoCapitalize="none" spellCheck={false} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} invalid={Boolean(emptyError) && !username.trim()} />
      <Input size="md" label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={Boolean(emptyError) && !password} />
      <Button type="submit" size="md" className="h-10" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-slate">Forgot your password? Ask the shop owner to reset it.</p>
    </form>
  );
}
