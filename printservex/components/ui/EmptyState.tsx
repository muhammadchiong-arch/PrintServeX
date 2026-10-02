import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
};

// Shown instead of an empty table or list, so the page never looks broken
export function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-[#f1f4f8] text-slate">
        <Icon size={24} aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate">{text}</p>}
      {action}
    </div>
  );
}
