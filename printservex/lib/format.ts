// 2 → "₱2.00", 1234.5 → "₱1,234.50"
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatPeso(amount: number): string {
  return peso.format(amount);
}

// All dates are shown in Philippine time, whatever the computer's time zone is
const TZ = "Asia/Manila";
const dateTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const timeOnly = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// "2026-10-01T09:14:00+08:00" → "Oct 1, 9:14 AM"
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
// → "Oct 1, 2026"
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
// → "9:14 AM"
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));
// → "2026-10-01" (handy for comparing days)
export const toDayKey = (iso: string) => dayKey.format(new Date(iso));

// Minutes → "2 h 17 m" or "34 m"
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} m`;
}

// "09174821953" → "0917 482 1953"
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}
