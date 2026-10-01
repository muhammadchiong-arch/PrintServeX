// Joins CSS class names and skips empty ones: cn("a", false && "b", "c") → "a c"
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
