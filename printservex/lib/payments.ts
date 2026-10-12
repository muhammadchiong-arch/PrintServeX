// Payment at checkout (Step 4): Cash on Pickup or GCash. Used by the browser AND the server.
// The database rules are in supabase/014_payments.sql.
// - The payment METHOD is how the customer wants to pay; the payment STATUS is what really happened.
// - GCash is checked by staff by hand: a reference number or a receipt is never proof by itself.

import type { PaymentMethod } from "@/lib/orders";

export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "rejected";

// Settings → Payment (admin). qrUrl is the public link of the shop's GCash QR image.
export type PaymentSettings = {
  cashEnabled: boolean;
  gcashEnabled: boolean;
  qrPath: string | null;
  qrUrl: string | null;
  accountName: string;
  instructions: string;
  receiptRequired: boolean;
};

// Before 014 is run (or if Supabase can't be reached): cash at pickup only, as before
export const PAYMENT_FALLBACK: PaymentSettings = {
  cashEnabled: true,
  gcashEnabled: false,
  qrPath: null,
  qrUrl: null,
  accountName: "",
  instructions: "",
  receiptRequired: true,
};

// What the customer chose in Step 4. The receipt file is uploaded with the order files.
export type PaymentChoice = { method: PaymentMethod | null; reference: string; receipt: File | null };
export const EMPTY_PAYMENT: PaymentChoice = { method: null, reference: "", receipt: null };

export const METHOD_LABELS: Record<PaymentMethod, string> = { cash: "Cash on Pickup", gcash: "GCash" };

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid — payable at pickup",
  pending_verification: "Pending verification",
  paid: "Paid",
  rejected: "Rejected — pay at pickup",
};

// Receipts: a photo or screenshot of the GCash confirmation
export const RECEIPT_RULES = { types: ["jpg", "jpeg", "png"], maxMb: 5 } as const;

// "1234 567 890 123" → "1234567890123". GCash numbers are 13 digits; other wallets may use letters.
export const normalizeGcashRef = (raw: string) => raw.replace(/[\s-]+/g, "").toUpperCase();

export function checkGcashRef(raw: string): string | null {
  const ref = normalizeGcashRef(raw);
  if (ref === "") return "Enter the reference number from your GCash receipt.";
  if (!/^[A-Z0-9]+$/.test(ref)) return "Use only the letters and numbers of the reference number.";
  if (ref.length < 8 || ref.length > 30) return "That doesn't look like a full reference number. GCash numbers have 13 digits.";
  return null;
}

// Shown on the confirmation and tracking pages: only the last 4 characters
export const maskRef = (ref: string) => (ref.length <= 4 ? ref : `•••• ${ref.slice(-4)}`);

export function checkReceipt(file: File | { name: string; size: number }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(RECEIPT_RULES.types as readonly string[]).includes(ext)) return `${file.name}: upload the receipt as a JPG or PNG picture.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > RECEIPT_RULES.maxMb * 1024 * 1024) return `${file.name} is too big. The receipt must be ${RECEIPT_RULES.maxMb} MB or less.`;
  return null;
}

// Can this order be paid by GCash? Business rule: only when the whole price is known.
export function gcashUnavailable(settings: PaymentSettings, quoteCount: number, total: number): string | null {
  if (!settings.gcashEnabled || !settings.qrUrl) return "GCash isn't available right now. You can pay at pickup.";
  if (quoteCount > 0) return "Some prices are confirmed by staff first, so this order is paid at pickup.";
  if (total <= 0) return "There is nothing to pay online yet.";
  return null;
}

// What still stops the customer from going to Review (null = ready).
// walkIn: staff see the payment on the customer's phone, so the receipt is optional.
export function paymentProblem(
  choice: PaymentChoice,
  settings: PaymentSettings,
  order: { quoteCount: number; total: number },
  walkIn: boolean,
): string | null {
  if (!choice.method) return "Choose how you'll pay.";
  // Walk-ins can always pay cash at the counter; the setting is for online orders
  if (choice.method === "cash") return settings.cashEnabled || walkIn ? null : "Cash on Pickup isn't available. Choose GCash.";
  const unavailable = gcashUnavailable(settings, order.quoteCount, order.total);
  if (unavailable) return unavailable;
  const refProblem = checkGcashRef(choice.reference);
  if (refProblem) return refProblem;
  if (choice.receipt) return checkReceipt(choice.receipt);
  if (settings.receiptRequired && !walkIn) return "Upload a screenshot of your GCash receipt.";
  return null;
}

