"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error";

type ToastInput = {
  message: string;
  kind?: ToastKind;
  // Optional button, e.g. { label: "Undo", onClick: ... }
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

// Call this inside any client component: const toast = useToast(); toast({ message: "Saved." })
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

const DISMISS_AFTER_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setItems((all) => [...all, { ...t, id }]);
      setTimeout(() => remove(id), DISMISS_AFTER_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Bottom center on mobile, bottom right on desktop. Screen readers announce new toasts. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const isError = item.kind === "error";
  const Icon = isError ? CircleX : CircleCheck;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg px-4 py-3 text-sm animate-[psx-fade-up_250ms_ease-out]",
        isError ? "border border-border bg-surface text-navy shadow-card" : "bg-navy text-white shadow-pop",
      )}
    >
      <Icon size={20} aria-hidden className={cn("shrink-0", isError ? "text-cancelled" : "text-[#4ade80]")} />
      <span className="flex-1">{item.message}</span>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDone();
          }}
          className="rounded font-semibold text-[#93b4ff] hover:underline"
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}
