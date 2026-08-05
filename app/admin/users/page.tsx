import { redirect } from "next/navigation";

/** Canonical users admin lives under moderation → users tab. */
export default async function AdminUsersRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status || "").toLowerCase();
  // Filter query preserved as hint; moderation users tab owns filters client-side.
  void status;
  redirect("/admin/moderation?tab=users");
}
