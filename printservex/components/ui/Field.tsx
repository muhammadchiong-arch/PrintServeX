import { CircleAlert } from "lucide-react";

// Shared label + hint + error wrapper used by Input and Select,
// so every field always has a visible label.
type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {label}
        {required && <span className="text-cancelled"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="flex items-center gap-1 text-xs text-cancelled">
          <CircleAlert size={14} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// Same look for text inputs and selects: 8px radius, blue focus with a soft ring
export function controlClasses(size: "lg" | "md", hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-surface px-3 text-navy placeholder:text-slate",
    "transition-[border-color,box-shadow] duration-200",
    "focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20",
    "disabled:cursor-not-allowed disabled:bg-bg disabled:text-slate",
    size === "lg" ? "h-12 text-base" : "h-9 text-sm",
    hasError ? "border-cancelled" : "border-border",
  ].join(" ");
}
