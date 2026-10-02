import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ShopProvider } from "@/components/ShopProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getShop } from "@/lib/shop-data";
import "./globals.css";

// Inter for body text, Montserrat SemiBold for headings
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: "600",
});

export const metadata: Metadata = {
  title: "PrintServeX",
  description:
    "Send print jobs online, get an instant price and track your order. Pick up and pay at the shop.",
};

// Shop details change rarely: re-read at most every 5 minutes (and right after an admin saves them)
export const revalidate = 300;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">
        <ShopProvider shop={shop}>
          <ToastProvider>{children}</ToastProvider>
        </ShopProvider>
      </body>
    </html>
  );
}
