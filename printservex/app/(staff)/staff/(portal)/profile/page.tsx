import type { Metadata } from "next";
import { Profile } from "@/components/staff/Profile";

export const metadata: Metadata = { title: "Profile · PrintServeX Staff" };

// S13 (opened from the profile menu in the top bar)
export default function ProfilePage() {
  return <Profile />;
}
