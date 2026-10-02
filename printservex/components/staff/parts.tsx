// Small layout pieces shared by the staff pages
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4">
      <h1 className="text-2xl">{children}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// White card with an optional title row (e.g. "Low stock" + "Inventory" link)
export function Panel({
  title,
  link,
  className,
  children,
}: {
  title?: string;
  link?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-xl bg-surface shadow-card", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base">{title}</h2>
          {link && (
            <Link href={link.href} className="text-sm font-semibold text-blue hover:underline">
              {link.label}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 self-start rounded text-sm font-semibold text-blue hover:underline">
      <ArrowLeft size={16} aria-hidden />
      {children}
    </Link>
  );
}

// Grey uppercase label used at the top of small cards
export function CardLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.04em] text-slate">{children}</h2>;
}

// The 12px uppercase header row above staff tables
export const tableHead = "bg-row-hover text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate";
