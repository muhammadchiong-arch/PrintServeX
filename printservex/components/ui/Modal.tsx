"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  // Buttons shown at the bottom right
  footer?: React.ReactNode;
};

// Uses the browser's built-in <dialog>: it traps keyboard focus,
// closes with Esc and dims the page behind it.
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Clicking the dark area outside the box closes it
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[440px] max-w-[calc(100%-32px)] rounded-xl bg-surface p-0 text-navy shadow-pop backdrop:bg-navy/45 open:animate-[psx-fade-up_220ms_ease-out] backdrop:animate-[psx-fade_220ms_ease-out]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-lg leading-7">
              {title}
            </h3>
            {description && <p className="text-sm text-slate">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-lg p-2 text-slate transition-colors duration-150 hover:bg-bg hover:text-navy"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
