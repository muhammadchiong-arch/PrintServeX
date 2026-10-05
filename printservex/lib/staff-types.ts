// Shapes of the staff portal's data (filled from Supabase by lib/staff-data.ts)

export type InventoryMove = {
  at: string;
  type: "in" | "out" | "adjust";
  change: number; // + adds stock, − removes stock
  balance: number; // quantity after this move
  note: string;
  by: string;
};

// What an inventory item is used for, so starting a print can take it from stock (011_inventory_links.sql)
export type InventoryLink =
  | { kind: "paper"; sizeId: string; typeId: string } // a paper size + paper type
  | { kind: "lamination"; size: "id" | "short" | "a4" | "legal" } // a lamination film size
  | { kind: "photo"; size: string }; // photo paper for one Photo Printing size (013_photo_print_sizes.sql)

export type InventoryItem = {
  id: string;
  name: string;
  unit: string; // e.g. "ream"
  qty: number;
  reorderLevel: number; // Business rule: at or below this number, the item is "Low stock"; 0 = "Out of stock"
  link: InventoryLink | null; // null = not linked (only counted by hand)
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
  mustChangePassword: boolean; // still using a temporary password
};

export type ActivityEntry = {
  at: string;
  who: string;
  action: string; // e.g. "Status changed"
  details: string;
};
