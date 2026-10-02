"use client";

// ONE place that holds all staff-portal data while we use sample data.
// Every staff page reads and changes data through useStaff(), so a change on one page
// (e.g. starting an order) shows on every other page. Reloading the page resets it.
// Later, each action below becomes a Supabase insert/update and nothing else changes.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { OrderDraft } from "@/components/order/build-order";
import { formatPeso } from "@/lib/format";
import { makeRef, PAYMENT_LABELS, type Order, type PaymentMethod } from "@/lib/orders";
import { SAMPLE_NOW, SAMPLE_ORDERS } from "@/lib/sample/orders";
import {
  CURRENT_USER_ID,
  SAMPLE_ACTIVITY,
  SAMPLE_INVENTORY,
  SAMPLE_USERS,
  type ActivityEntry,
  type InventoryItem,
  type Role,
  type StaffUser,
} from "@/lib/sample/staff";
import { STATUS_LABELS, type OrderStatus } from "@/lib/status";

// The sample data is set on Oct 1, 2026, so the portal's clock starts there and runs normally.
// When real data is connected, replace this with: () => new Date()
const loadedAt = Date.now();
export const staffNow = () => new Date(Date.parse(SAMPLE_NOW) + (Date.now() - loadedAt));

export type StaffData = {
  orders: Order[];
  inventory: InventoryItem[];
  users: StaffUser[];
  activity: ActivityEntry[]; // newest first (also the audit log)
};

type StaffContext = StaffData & {
  me: StaffUser;
  isAdmin: boolean;
  setStatus: (ref: string, status: OrderStatus) => void;
  cancelOrder: (ref: string, reason: string) => void;
  completeOrder: (ref: string, method: PaymentMethod, amount: number) => void;
  setFinalPrice: (ref: string, amount: number, note: string) => void;
  setRemarks: (ref: string, remarks: string) => void;
  addWalkInOrder: (draft: OrderDraft) => string;
  moveStock: (itemId: string, type: "in" | "out", qty: number, note: string) => void;
  addItem: (item: { name: string; unit: string; qty: number; reorderLevel: number }) => void;
  addUser: (user: { name: string; username: string; role: Role }) => void;
  setUserActive: (id: string, active: boolean) => void;
  log: (action: string, details: string) => void;
  replaceAll: (data: StaffData) => void;
};

const Ctx = createContext<StaffContext | null>(null);

export function useStaff(): StaffContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaff must be used inside <StaffStoreProvider>");
  return v;
}

const initial: StaffData = { orders: SAMPLE_ORDERS, inventory: SAMPLE_INVENTORY, users: SAMPLE_USERS, activity: SAMPLE_ACTIVITY };

export function StaffStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StaffData>(initial);
  const me = data.users.find((u) => u.id === CURRENT_USER_ID) ?? data.users[0];

  // Adds a line to the activity / audit log
  const log = useCallback(
    (action: string, details: string) =>
      setData((d) => ({ ...d, activity: [{ at: staffNow().toISOString(), who: me.name, action, details }, ...d.activity] })),
    [me.name],
  );

  const updateOrder = useCallback(
    (ref: string, change: (o: Order) => Order) => setData((d) => ({ ...d, orders: d.orders.map((o) => (o.ref === ref ? change(o) : o)) })),
    [],
  );

  const value = useMemo((): StaffContext => {
    const at = () => staffNow().toISOString();

    return {
      ...data,
      me,
      isAdmin: me.role === "Admin",
      log,

      setStatus: (ref, status) => {
        const before = data.orders.find((o) => o.ref === ref)?.status;
        updateOrder(ref, (o) => ({ ...o, status, history: [...o.history, { status, at: at(), by: me.name }] }));
        log("Status changed", `${ref} · ${before ? STATUS_LABELS[before] : "?"} → ${STATUS_LABELS[status]}`);
      },

      cancelOrder: (ref, reason) => {
        updateOrder(ref, (o) => ({
          ...o,
          status: "cancelled",
          cancelReason: reason,
          history: [...o.history, { status: "cancelled", at: at(), by: me.name, note: reason }],
        }));
        log("Order cancelled", `${ref} · ${reason}`);
      },

      // Business rule: an order is completed only when payment is recorded at the counter
      completeOrder: (ref, method, amount) => {
        const note = `Paid ${formatPeso(amount)} ${PAYMENT_LABELS[method].toLowerCase()}`;
        updateOrder(ref, (o) => ({
          ...o,
          status: "completed",
          payment: { method, amount, at: at(), by: me.name },
          history: [...o.history, { status: "completed", at: at(), by: me.name, note }],
        }));
        log("Order completed", `${ref} · ${note}`);
      },

      setFinalPrice: (ref, amount, note) => {
        const o = data.orders.find((x) => x.ref === ref);
        updateOrder(ref, (x) => ({ ...x, final: { amount, note } }));
        log("Final price edited", `${ref} · ${o?.final ? formatPeso(o.final.amount) : "estimate"} → ${formatPeso(amount)}`);
      },

      setRemarks: (ref, remarks) => updateOrder(ref, (o) => ({ ...o, remarks })),

      addWalkInOrder: (draft) => {
        const now = staffNow();
        // Next number for today, e.g. PSX-20261001-0049
        const today = makeRef(now, 0).slice(0, 13);
        const seq = Math.max(0, ...data.orders.filter((o) => o.ref.startsWith(today)).map((o) => Number(o.ref.slice(-4)))) + 1;
        const ref = makeRef(now, seq);
        const order: Order = {
          ...draft,
          ref,
          source: "walk-in",
          status: "pending",
          createdAt: now.toISOString(),
          history: [{ status: "pending", at: now.toISOString(), by: me.name, note: "Walk-in" }],
        };
        setData((d) => ({ ...d, orders: [order, ...d.orders] }));
        log("Walk-in order created", `${ref} · ${draft.customer.name}`);
        return ref;
      },

      moveStock: (itemId, type, qty, note) => {
        const item = data.inventory.find((i) => i.id === itemId);
        if (!item) return;
        const change = type === "in" ? qty : -qty;
        const balance = Math.max(0, item.qty + change);
        setData((d) => ({
          ...d,
          inventory: d.inventory.map((i) =>
            i.id === itemId ? { ...i, qty: balance, moves: [{ at: at(), type, change, balance, note, by: me.name }, ...i.moves] } : i,
          ),
        }));
        log(type === "in" ? "Stock in" : "Stock out", `${item.name} · ${change > 0 ? "+" : "−"}${qty} ${item.unit}`);
      },

      addItem: (item) => {
        const id = `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
        const moves = item.qty > 0 ? [{ at: at(), type: "in" as const, change: item.qty, balance: item.qty, note: "Opening stock", by: me.name }] : [];
        setData((d) => ({ ...d, inventory: [...d.inventory, { ...item, id, moves }] }));
        log("Item added", `${item.name} · ${item.qty} ${item.unit}`);
      },

      addUser: (user) => {
        setData((d) => ({ ...d, users: [...d.users, { ...user, id: `u${Date.now()}`, active: true, lastSignIn: null }] }));
        log("Staff added", `${user.name} · ${user.role}`);
      },

      setUserActive: (id, active) => {
        const u = data.users.find((x) => x.id === id);
        setData((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, active } : x)) }));
        log(active ? "Staff reactivated" : "Staff deactivated", u?.name ?? id);
      },

      replaceAll: (next) => setData(next),
    };
  }, [data, me, log, updateOrder]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
