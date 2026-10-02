"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// S1: UI only for now. Any username + password opens the portal.
// Later: supabase.auth.signInWithPassword() and a lock after 5 wrong tries.
export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError("");
    router.push("/staff/dashboard");
  };

  return (
    <form onSubmit={submit} noValidate className="flex w-[400px] max-w-full flex-col gap-5 rounded-xl bg-surface p-8 shadow-card">
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
      <Input size="md" label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} invalid={Boolean(error) && !username.trim()} />
      <Input size="md" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={Boolean(error) && !password} />
      <Button type="submit" size="md" className="h-10">
        Sign in
      </Button>
      <p className="text-center text-xs text-slate">Forgot your password? Ask the shop owner to reset it.</p>
    </form>
  );
}
