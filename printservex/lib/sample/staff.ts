// SAMPLE DATA for the staff portal until these tables exist in Supabase.

export type InventoryMove = {
  at: string;
  type: "in" | "out" | "adjust";
  change: number; // + adds stock, − removes stock
  balance: number; // quantity after this move
  note: string;
  by: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string; // e.g. "ream"
  qty: number;
  reorderLevel: number; // Business rule: at or below this number, the item is "Low stock"
  moves: InventoryMove[]; // newest first
};

export type Role = "Admin" | "Staff";

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  lastSignIn: string | null; // ISO, or null = never
};

export type ActivityEntry = {
  at: string;
  who: string;
  action: string; // e.g. "Status changed"
  details: string;
};

const t = (day: string, time: string) => `2026-${day}T${time}:00+08:00`;

export const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: "bond-a4-80",
    name: "Bond paper A4 80gsm",
    unit: "ream",
    qty: 3,
    reorderLevel: 10,
    moves: [
      { at: t("10-01", "11:12"), type: "out", change: -2, balance: 3, note: "Daily use, morning batch", by: "Rhea Ocampo" },
      { at: t("09-30", "17:50"), type: "out", change: -3, balance: 5, note: "Daily use", by: "Dennis Cruz" },
      { at: t("09-30", "09:15"), type: "out", change: -2, balance: 8, note: "PSX-20260930-0117 thesis run", by: "Rhea Ocampo" },
      { at: t("09-29", "16:30"), type: "adjust", change: -1, balance: 10, note: "Damaged by water leak", by: "Maricel Santos" },
      { at: t("09-29", "08:40"), type: "out", change: -4, balance: 11, note: "Daily use", by: "Dennis Cruz" },
      { at: t("09-27", "10:05"), type: "in", change: 10, balance: 15, note: "Office Warehouse, DR 55607", by: "Maricel Santos" },
      { at: t("09-26", "18:00"), type: "out", change: -3, balance: 5, note: "Daily use", by: "Rhea Ocampo" },
    ],
  },
  {
    id: "bond-short-70",
    name: "Bond paper Short 70gsm",
    unit: "ream",
    qty: 18,
    reorderLevel: 10,
    moves: [
      { at: t("09-30", "08:30"), type: "out", change: -2, balance: 18, note: "Daily use", by: "Dennis Cruz" },
      { at: t("09-28", "10:00"), type: "in", change: 15, balance: 20, note: "Office Warehouse, DR 55588", by: "Maricel Santos" },
    ],
  },
  {
    id: "bond-long-70",
    name: "Bond paper Long 70gsm",
    unit: "ream",
    qty: 7,
    reorderLevel: 8,
    moves: [{ at: t("09-30", "14:10"), type: "out", change: -2, balance: 7, note: "PSX-20261001-0034 feasibility study", by: "Rhea Ocampo" }],
  },
  {
    id: "photo-glossy-a4",
    name: "Photo paper glossy A4",
    unit: "pack (20)",
    qty: 6,
    reorderLevel: 4,
    moves: [{ at: t("09-25", "11:00"), type: "in", change: 5, balance: 6, note: "Lazada order #4471", by: "Maricel Santos" }],
  },
  {
    id: "ink-cyan-003",
    name: "Cyan ink (Epson 003)",
    unit: "bottle",
    qty: 1,
    reorderLevel: 3,
    moves: [{ at: t("09-30", "12:40"), type: "out", change: -1, balance: 1, note: "Refilled Printer 2", by: "Dennis Cruz" }],
  },
  {
    id: "ink-black-003",
    name: "Black ink (Epson 003)",
    unit: "bottle",
    qty: 5,
    reorderLevel: 3,
    moves: [{ at: t("09-27", "10:05"), type: "in", change: 4, balance: 5, note: "Office Warehouse, DR 55607", by: "Maricel Santos" }],
  },
  {
    id: "laminating-film-a4",
    name: "Laminating film A4",
    unit: "pc",
    qty: 42,
    reorderLevel: 100,
    moves: [{ at: t("10-01", "10:25"), type: "out", change: -1, balance: 42, note: "PSX-20261001-0044", by: "Maricel Santos" }],
  },
  {
    id: "binding-comb-10mm",
    name: "Binding comb 10mm",
    unit: "pc",
    qty: 260,
    reorderLevel: 100,
    moves: [{ at: t("09-30", "13:00"), type: "out", change: -2, balance: 260, note: "PSX-20260930-0117", by: "Rhea Ocampo" }],
  },
];

export const SAMPLE_USERS: StaffUser[] = [
  { id: "u1", name: "Maricel Santos", username: "maricel.santos", role: "Admin", active: true, lastSignIn: t("10-01", "07:58") },
  { id: "u2", name: "Rhea Ocampo", username: "rhea.ocampo", role: "Staff", active: true, lastSignIn: t("10-01", "08:03") },
  { id: "u3", name: "Dennis Cruz", username: "dennis.cruz", role: "Staff", active: true, lastSignIn: t("09-29", "17:41") },
  { id: "u4", name: "Liza Manalo", username: "liza.manalo", role: "Staff", active: false, lastSignIn: t("07-14", "14:10") },
];

export const SAMPLE_ACTIVITY: ActivityEntry[] = [
  { at: t("10-01", "11:40"), who: "Rhea Ocampo", action: "Order completed", details: "PSX-20261001-0028 · paid ₱36.00 cash" },
  { at: t("10-01", "11:37"), who: "Maricel Santos", action: "Status changed", details: "PSX-20261001-0042 · Processing → Ready for Pickup" },
  { at: t("10-01", "11:21"), who: "Maricel Santos", action: "Final price edited", details: "PSX-20261001-0042 · ₱189.00 → ₱181.00" },
  { at: t("10-01", "11:12"), who: "Rhea Ocampo", action: "Stock out", details: "Bond paper A4 80gsm · −2 reams" },
  { at: t("10-01", "10:48"), who: "Maricel Santos", action: "Order cancelled", details: "PSX-20261001-0029 · Files password protected" },
  { at: t("10-01", "09:02"), who: "Maricel Santos", action: "Price changed", details: "Color Long Bond 70gsm · ₱8.50 → ₱9.00" },
  { at: t("10-01", "07:58"), who: "Maricel Santos", action: "Signed in", details: "Chrome on Windows" },
  { at: t("10-01", "07:00"), who: "System", action: "Backup created", details: "Automatic · 18.4 MB" },
];
