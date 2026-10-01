import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

// Translucent header: the page shows through, slightly blurred, as you scroll.
// data-material lets globals.css make it solid when the phone asks for less transparency.
export function CustomerHeader() {
  return (
    <header
      data-material
      className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-8">
        <Link href="/" aria-label="PrintServeX home" className="flex shrink-0 items-center gap-2 rounded-lg">
          {/* Phones: app icon + name (the full logo's tagline is too small to read). Larger screens: full logo. */}
          <Image src="/app-icon.png" alt="" width={32} height={32} priority className="size-8 sm:hidden" />
          <span aria-hidden className="font-heading text-lg font-semibold sm:hidden">
            PrintServe<span className="text-blue">X</span>
          </span>
          <Image
            src="/logo-horizontal-color.png"
            alt="PrintServeX"
            width={2400}
            height={698}
            priority
            className="hidden h-11 w-auto sm:block"
          />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          <Link href="/track" className={buttonClasses("ghost", "lg", "px-3 text-sm text-navy hover:bg-bg sm:h-10")}>
            <Search size={18} aria-hidden />
            Track order
          </Link>
          {/* On phones the hero has the big "Place an order" button, so the header keeps only "Track order" */}
          <Link href="/order" className={buttonClasses("primary", "lg", "h-10 px-4 text-sm max-sm:hidden")}>
            Place an order
          </Link>
        </nav>
      </div>
    </header>
  );
}
