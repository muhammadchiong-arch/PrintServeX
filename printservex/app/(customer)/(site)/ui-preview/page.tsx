import type { Metadata } from "next";
import { UiPreview } from "@/components/dev/UiPreview";

// TEMPORARY page: delete after the real screens are built
export const metadata: Metadata = { title: "UI preview · PrintServeX", robots: { index: false } };

export default function CustomerUiPreviewPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
      <UiPreview size="lg" />
    </div>
  );
}
