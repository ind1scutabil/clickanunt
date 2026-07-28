import { redirect } from "next/navigation";

/** Canonical listings admin lives under moderation tabs. */
export default async function AdminListingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status || "").toLowerCase();
  const tab =
    status === "pending"
      ? "pending"
      : status === "rejected"
        ? "rejected"
        : status === "approved" || status === "active"
          ? "approved"
          : "pending";
  redirect(`/admin/moderation?tab=${tab}`);
}
