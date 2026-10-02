"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field } from "./Field";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  labelNote?: string; // grey text after the label, e.g. "(staff only)"
  hint?: string;
  error?: string;
};

export function Textarea({ label, labelNote, hint, error, id, required, className, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={labelNote ? `${label} ${labelNote}` : label} required={required} hint={hint} error={error}>
      <textarea
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        className={cn(
          "min-h-20 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-navy placeholder:text-slate",
          "transition-[border-color,box-shadow] duration-200 focus:border-blue focus:outline-none focus:ring-[3px] focus:ring-blue/20",
          error ? "border-cancelled" : "border-border",
          className,
        )}
        {...rest}
      />
    </Field>
  );
}
