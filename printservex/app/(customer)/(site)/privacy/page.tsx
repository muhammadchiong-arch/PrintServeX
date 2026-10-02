import type { Metadata } from "next";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = { title: "Privacy notice · PrintServeX" };

// Short privacy notice for the consent checkbox on the order form. Have the shop owner review it.
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-10 text-pretty [&_h2]:mt-4 [&_h2]:text-xl [&_p]:text-slate">
      <h1 className="text-3xl">Privacy notice</h1>
      <p>
        {SHOP.name} collects only what we need to print your order and tell you when it&apos;s ready: your name, contact number, optional
        email, and the files you upload.
      </p>
      <h2>How we use it</h2>
      <p>We use your details to process your order, contact you about it, and let you track it with your reference number. We don&apos;t sell or share them.</p>
      <h2>How long we keep it</h2>
      <p>We keep your details and files for 30 days, then delete the files. Order records (without files) are kept for our sales records.</p>
      <h2>Your rights</h2>
      <p>
        You can ask us to see, correct or delete your details. Visit us at {SHOP.address}, {SHOP.area}, or call {SHOP.phone}.
      </p>
    </article>
  );
}
