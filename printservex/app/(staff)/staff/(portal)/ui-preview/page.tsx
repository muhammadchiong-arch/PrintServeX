import type { Metadata } from "next";
import { UiPreview } from "@/components/dev/UiPreview";

// TEMPORARY page: delete after the real screens are built
export const metadata: Metadata = { title: "UI preview · PrintServeX Staff", robots: { index: false } };

export default function StaffUiPreviewPage() {
  return <UiPreview size="md" />;
}
