import { cn } from "@/lib/cn";

// Three small cyan / magenta / yellow bars: the only place the CMY brand colors appear
export function InkStrip({ size = "sm" }: { size?: "sm" | "lg" }) {
  const bar = cn("h-1 rounded-sm", size === "lg" ? "w-6" : "w-4");
  return (
    <div aria-hidden className="flex gap-1">
      <span className={cn(bar, "bg-cyan")} />
      <span className={cn(bar, "bg-magenta")} />
      <span className={cn(bar, "bg-yellow")} />
    </div>
  );
}
