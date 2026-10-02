"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/staff-auth-actions";

// "Maricel Santos" → "MS"
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm transition-colors duration-150 hover:bg-bg"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-processing-tint text-xs font-semibold text-blue-hover">
          {initials(name)}
        </span>
        <span className="font-semibold">{name}</span>
        <ChevronDown size={16} aria-hidden className={cn("text-slate transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 flex w-48 flex-col rounded-lg border border-border bg-surface py-1 text-sm shadow-card animate-[psx-fade-up_180ms_ease-out]"
        >
          <Link role="menuitem" href="/staff/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-bg">
            <User size={16} aria-hidden className="text-slate" />
            Profile
          </Link>
          {/* A form, so log out works on the server (clears the sign-in cookies) */}
          <form action={signOut}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg">
              <LogOut size={16} aria-hidden className="text-slate" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
