import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
// lg = 48px (customer pages, touch friendly) · md = 36px (staff pages, compact)
export type ButtonSize = "lg" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap " +
  "transition-[background-color,border-color,color,transform] duration-200 " +
  // Instant press feedback
  "active:translate-y-px " +
  // Disabled: slate text on border gray, never opacity alone
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-border disabled:text-slate disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white hover:bg-blue-hover",
  secondary: "border border-border bg-surface text-navy hover:bg-bg",
  danger: "bg-cancelled text-white hover:bg-[#991b1b]",
  dangerOutline: "border border-cancelled bg-surface text-cancelled hover:bg-cancelled-tint",
  ghost: "bg-transparent text-blue hover:bg-blue-tint",
};

const sizes: Record<ButtonSize, string> = {
  lg: "h-12 px-5 text-base",
  md: "h-9 px-3 text-sm",
};

// Use this to style a <Link> like a button: <Link className={buttonClasses()} />
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "lg",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], variant === "ghost" && size === "lg" && "px-4", className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "lg", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}
