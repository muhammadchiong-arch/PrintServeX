import Image from "next/image";
import Link from "next/link";
import { SHOP } from "@/lib/shop";

// Navy footer: shop address, phone and hours, plus the legal links
export function CustomerFooter() {
  return (
    <footer className="bg-navy text-sm text-[#c9d2e3]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
        <div className="flex items-start gap-3 sm:items-center">
          <Image src="/app-icon.png" alt="" width={32} height={32} className="hidden size-8 sm:block" />
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-1">
            <span className="font-semibold text-white sm:font-normal sm:text-[#c9d2e3]">
              {SHOP.name} · {SHOP.area}
            </span>
            <span>
              <span className="hidden sm:inline"> · </span>
              {SHOP.address} · {SHOP.phone}
            </span>
            <span>
              <span className="hidden sm:inline"> · </span>
              {SHOP.hours}
            </span>
          </div>
        </div>
        <nav aria-label="Legal" className="flex gap-6">
          <Link href="/privacy" className="py-3 text-white hover:underline sm:py-0">
            Privacy notice
          </Link>
          <Link href="/terms" className="py-3 text-white hover:underline sm:py-0">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
