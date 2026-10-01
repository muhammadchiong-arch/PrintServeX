import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
