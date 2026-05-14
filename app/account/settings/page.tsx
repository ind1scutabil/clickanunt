import { redirect } from "next/navigation";

/** Alias URL — setările contului sunt implementate la `/dashboard/settings`. */
export default function AccountSettingsRedirectPage() {
  redirect("/dashboard/settings");
}
