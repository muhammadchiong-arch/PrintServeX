// Shop details shown in the footer and on customer pages.
// The real values come from Supabase (shop_settings, edited in Settings → Shop info):
// server code uses getShop() from lib/shop-data.ts, browser code uses useShop().
// These are only the fallback if the database can't be reached.
export type Shop = {
  name: string;
  area: string;
  address: string;
  phone: string;
  hours: string;
  hoursLong: string;
  usualTurnaround: string;
  email: string;
  pickupNote: string; // shown on the customer's order status page when the order is ready
};

export const SHOP_FALLBACK: Shop = {
  name: "PrintServeX",
  area: "Sta. Cruz, Manila",
  address: "214 Rizal Ave.",
  phone: "0917 305 8841",
  hours: "Mon to Sat, 8:00 AM to 7:00 PM",
  hoursLong: "Monday to Saturday, 8:00 AM to 7:00 PM",
  usualTurnaround: "within 2 hours",
  email: "hello@printservex.ph",
  pickupNote: "Bring your reference number. Counter 2, open until 7:00 PM.",
};

// Business rules for uploads (also used by the order form in C2).
// 25 MB is also set on the "order-files" storage bucket (003_orders.sql), so it isn't editable here.
export const UPLOAD_RULES = {
  fileTypes: ["PDF", "DOCX", "JPG", "PNG"],
  maxFileMb: 25,
  maxFilesPerOrder: 10,
} as const;
