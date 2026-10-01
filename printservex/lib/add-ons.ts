// Optional add-ons and their prices (₱).
// Your Supabase has no add-ons table yet, so these live here for now.
// When we build S9 Pricing & options, they move to Supabase.
export const ADD_ONS = {
  lamination: { label: "Lamination", price: 25, unit: "per sheet" },
  binding: { label: "Binding", price: 45, unit: "per set" },
} as const;

export type AddOnKey = keyof typeof ADD_ONS;
