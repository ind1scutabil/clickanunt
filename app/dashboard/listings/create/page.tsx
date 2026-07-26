import { redirect } from "next/navigation";

/**
 * Legacy deep link — no create UI lives under dashboard.
 * Prefer /listings/new (canonical OptimizedListingFlow).
 */
export default function DashboardListingsCreateRedirectPage() {
  redirect("/listings/new");
}
