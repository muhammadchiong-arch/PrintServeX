import { redirect } from "next/navigation";

// /staff on its own opens the dashboard
export default function StaffIndexPage() {
  redirect("/staff/dashboard");
}
