import { CustomerFooter } from "@/components/customer/CustomerFooter";
import { CustomerHeader } from "@/components/customer/CustomerHeader";

// Wraps the customer pages that show the normal header and footer (home, track order).
// The order form (/order) is outside this group because it has its own step header.
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <CustomerHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <CustomerFooter />
    </div>
  );
}
