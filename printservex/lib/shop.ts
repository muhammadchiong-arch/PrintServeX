// Shop details shown in the footer and on customer pages.
// Later these can come from the Settings → Shop info screen (S12).
export const SHOP = {
  name: "PrintServeX",
  area: "Sta. Cruz, Manila",
  address: "214 Rizal Ave.",
  phone: "0917 305 8841",
  hours: "Mon to Sat, 8:00 AM to 7:00 PM",
  hoursLong: "Monday to Saturday, 8:00 AM to 7:00 PM",
  usualTurnaround: "within 2 hours",
  email: "hello@printservex.ph",
  // Shown on the customer's order status page when the order is ready
  pickupNote: "Bring your reference number. Counter 2, open until 7:00 PM.",
} as const;

// Business rules for uploads (also used by the order form in C2)
export const UPLOAD_RULES = {
  fileTypes: ["PDF", "DOCX", "JPG", "PNG"],
  maxFileMb: 25,
  maxFilesPerOrder: 10,
} as const;
