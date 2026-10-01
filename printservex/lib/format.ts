// 2 → "₱2.00", 1234.5 → "₱1,234.50"
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatPeso(amount: number): string {
  return peso.format(amount);
}
