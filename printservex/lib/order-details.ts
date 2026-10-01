// Step 1 "Your details": the fields and their checks

export type CustomerDetails = {
  name: string;
  phone: string;
  email: string; // optional, "" when empty
  consent: boolean;
};

export type DetailsErrors = Partial<Record<keyof CustomerDetails, string>>;

export const EMPTY_DETAILS: CustomerDetails = { name: "", phone: "", email: "", consent: false };

// "0917 482 1953", "0917-482-1953" or "+63 917 482 1953" → "09174821953"
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
}

// Business rule: a Philippine mobile number (11 digits starting with 09).
// The last 4 digits are used later to track the order.
export function validateDetails(d: CustomerDetails): DetailsErrors {
  const errors: DetailsErrors = {};
  if (d.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!/^09\d{9}$/.test(normalizePhone(d.phone))) errors.phone = "Enter an 11-digit mobile number, like 0917 482 1953.";
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.email = "Enter a valid email, or leave it empty.";
  if (!d.consent) errors.consent = "Check the privacy box to continue.";
  return errors;
}
