import { Hash, Store, Upload, type LucideIcon } from "lucide-react";
import { Container } from "@/components/customer/Container";

type Step = { icon: LucideIcon; title: string; short: string; long: string };

// "short" is shown on phones, "long" on desktop cards (as in the design)
const STEPS: Step[] = [
  {
    icon: Upload,
    title: "Upload and choose options",
    short: "Paper size, color or B&W, copies.",
    long: "Pick paper size, color or B&W, and copies. The price updates as you go.",
  },
  {
    icon: Hash,
    title: "Get your reference number",
    short: "Use it to check your order status.",
    long: "Use it with your contact number to check your status anytime.",
  },
  {
    icon: Store,
    title: "Pick up and pay at the shop",
    short: "Show your reference number at the counter.",
    long: "We'll mark it Ready for Pickup. Show your reference number and pay at the counter.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="py-8 lg:py-16">
      <Container className="flex flex-col gap-4 lg:gap-6">
        <h2 id="how-title" className="text-xl lg:text-3xl lg:tracking-[-0.015em]">
          How it works
        </h2>
        <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-6">
          {STEPS.map(({ icon: Icon, title, short, long }, i) => (
            <li
              key={title}
              className="flex items-start gap-3 lg:flex-col lg:rounded-xl lg:bg-surface lg:p-6 lg:shadow-card"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-processing-tint text-blue lg:size-11">
                <Icon aria-hidden className="size-5 lg:size-6" />
              </span>
              <div className="flex flex-col lg:gap-3">
                <span className="font-semibold lg:font-heading lg:text-lg">
                  {i + 1}. {title}
                </span>
                <span className="text-sm text-slate lg:hidden">{short}</span>
                <span className="text-slate max-lg:hidden">{long}</span>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
