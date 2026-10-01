import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  // Inner spacing: sm 16px · md 24px · lg 32px · none for tables that touch the edges
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

// White surface, 12px radius, the one soft shadow
export function Card({ padding = "md", className, ...rest }: CardProps) {
  return <div className={cn("rounded-xl bg-surface shadow-card", paddings[padding], className)} {...rest} />;
}
