"use client";

// ONE place that holds all staff-portal data. The data is loaded from Supabase on the server
// (lib/staff-data.ts, in the portal layout) and passed in here. Every action saves on the
// server (lib/staff-actions.ts), then router.refresh() loads the data again, so every page
// shows the saved result. Errors are shown as a red toast, and the action returns false.

import { createContext, useCallback, useContext, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { PaymentMethod } from "@/lib/orders";
import * as actions from "@/lib/staff-actions";
import type { StaffData } from "@/lib/staff-data";
import type { InventoryLink, StaffUser } from "@/lib/staff-types";

type ItemFields = { name: string; unit: string; reorderLevel: number; link: InventoryLink | null };

// Other staff (and online customers) change data too, so reload it every minute
const REFRESH_MS = 60_000;

type StaffContext = StaffData & {
  me: StaffUser;
  isAdmin: boolean;
  refreshing: boolean;
  // Each resolves to true when it was saved
  setStatus: (ref: string, status: "processing" | "ready") => Promise<boolean>;
  cancelOrder: (ref: string, reason: string) => Promise<boolean>;
  completeOrder: (ref: string, method: PaymentMethod) => Promise<boolean>;
  setFinalPrice: (ref: string, amount: number, note: string) => Promise<boolean>;
  setRemarks: (ref: string, remarks: string) => Promise<boolean>;
  moveStock: (itemId: string, type: "in" | "out", qty: number, note: string) => Promise<boolean>;
  addItem: (item: ItemFields & { qty: number }) => Promise<boolean>;
  updateItem: (itemId: string, item: ItemFields) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>; // admin only
  setUserActive: (id: string, active: boolean) => Promise<boolean>;
  logBackup: (details: string) => Promise<boolean>;
  refresh: () => void;
};

const Ctx = createContext<StaffContext | null>(null);

export function useStaff(): StaffContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaff must be used inside <StaffStoreProvider>");
  return v;
}

export function StaffStoreProvider({ me, data, children }: { me: StaffUser; data: StaffData; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [refreshing, startRefresh] = useTransition();
  const refresh = useCallback(() => startRefresh(() => router.refresh()), [router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Runs one server action: on error shows it, on success reloads the data
  const run = useCallback(
    async (call: Promise<actions.ActionResult>): Promise<boolean> => {
      let result: actions.ActionResult;
      try {
        result = await call;
      } catch {
        result = { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
      }
      if (!result.ok) {
        toast({ kind: "error", message: result.error });
        refresh(); // someone else may have changed it first, so show the latest
        return false;
      }
      refresh();
      return true;
    },
    [toast, refresh],
  );

  const value = useMemo(
    (): StaffContext => ({
      ...data,
      me,
      isAdmin: me.role === "Admin",
      refreshing,
      refresh,
      setStatus: (ref, status) => run(actions.setOrderStatus(ref, status)),
      cancelOrder: (ref, reason) => run(actions.cancelOrder(ref, reason)),
      completeOrder: (ref, method) => run(actions.completeOrder(ref, method)),
      setFinalPrice: (ref, amount, note) => run(actions.setFinalPrice(ref, amount, note)),
      setRemarks: (ref, remarks) => run(actions.setRemarks(ref, remarks)),
      moveStock: (itemId, type, qty, note) => run(actions.moveStock(itemId, type, qty, note)),
      addItem: (item) => run(actions.addItem(item)),
      updateItem: (itemId, item) => run(actions.updateItem(itemId, item)),
      deleteItem: (itemId) => run(actions.deleteItem(itemId)),
      setUserActive: (id, active) => run(actions.setStaffActive(id, active)),
      logBackup: (details) => run(actions.logBackup(details)),
    }),
    [data, me, refreshing, refresh, run],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
