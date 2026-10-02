import Image from "next/image";
import Link from "next/link";
import { getShop } from "@/lib/shop-data";

// Navy footer: shop address, phone and hours, the legal links and a quiet staff sign-in link
export async function CustomerFooter() {
  const shop = await getShop();
  return (
    <footer className="bg-navy text-sm text-[#c9d2e3]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
        <div className="flex items-start gap-3 sm:items-center">
          <Image src="/app-icon.png" alt="" width={32} height={32} className="hidden size-8 sm:block" />
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-1">
            <span className="font-semibold text-white sm:font-normal sm:text-[#c9d2e3]">
              {shop.name} · {shop.area}
            </span>
            <span>
              <span className="hidden sm:inline"> · </span>
              {shop.address} · {shop.phone}
            </span>
            <span>
              <span className="hidden sm:inline"> · </span>
              {shop.hours}
            </span>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6">
          <Link href="/privacy" className="py-3 text-white hover:underline sm:py-0">
            Privacy notice
          </Link>
          <Link href="/terms" className="py-3 text-white hover:underline sm:py-0">
            Terms
          </Link>
          {/* For shop staff; customers never need an account */}
          <Link href="/staff/login" className="py-3 text-[#c9d2e3] hover:text-white hover:underline sm:py-0">
            Staff sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
