"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type FaqItem = { q: string; a: string };

// Phones: tap a question to open it (one open at a time).
// Desktop: there is room, so every answer is always shown.
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);

  return (
    <ul className="flex flex-col gap-2 lg:gap-4">
      {items.map((item, i) => {
        const isOpen = open === i;
        const answerId = `faq-answer-${i}`;
        return (
          <li key={item.q} className="overflow-hidden rounded-xl bg-surface">
            {/* Phone: question is a button */}
            <h3 className="font-sans text-base lg:hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-left font-semibold transition-colors duration-150 active:bg-bg"
              >
                {item.q}
                <ChevronDown
                  size={20}
                  aria-hidden
                  className={cn("shrink-0 text-slate transition-transform duration-200 ease-snap", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            {/* Desktop: question is plain text */}
            <h3 className="px-6 pt-5 font-sans text-base font-semibold max-lg:hidden">{item.q}</h3>

            {/* The grid-rows trick animates the height smoothly from 0 to auto */}
            <div
              id={answerId}
              className={cn(
                "grid transition-[grid-template-rows,opacity,visibility] duration-250 ease-snap lg:visible lg:grid-rows-[1fr] lg:opacity-100",
                // invisible = also hidden from screen readers while closed
                isOpen ? "grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-sm text-pretty text-slate lg:px-6 lg:pb-5 lg:pt-2 lg:text-base">{item.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
