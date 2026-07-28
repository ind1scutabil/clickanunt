import { redirect } from "next/navigation";

/** Analytics live on the admin dashboard command center. */
export default function AdminAnalyticsRedirectPage() {
  redirect("/admin/dashboard");
}
