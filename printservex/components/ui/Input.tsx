"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClasses } from "./Field";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  hint?: string;
  error?: string;
  size?: "lg" | "md";
};

export function Input({ label, hint, error, size = "lg", id, required, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} required={required} hint={hint} error={error}>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        className={cn(controlClasses(size, Boolean(error)), className)}
        {...rest}
      />
    </Field>
  );
}
