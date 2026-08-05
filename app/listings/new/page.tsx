import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ApexToWwwRedirect from "@/app/components/ApexToWwwRedirect";
import OptimizedListingFlow from "@/app/components/OptimizedListingFlow";
import { verifyToken } from "@/lib/auth";

/**
 * Server auth for publish — avoids client auth-gate skeleton→form CLS when session cookies exist.
 * Unauthenticated users hard-redirect to login (same next= contract as PublishListingAuthGate).
 */
export default async function Page() {
  const jar = await cookies();
  const token = jar.get("accessToken")?.value || "";
  const session = token ? await verifyToken(token) : null;
  if (!session?.userId) {
    redirect("/auth/login?next=%2Flistings%2Fnew");
  }

  return (
    <>
      <ApexToWwwRedirect />
      <Navbar />
      <OptimizedListingFlow />
    </>
  );
}
