import React from "react";
import Navbar from "@/app/components/Navbar";
import ApexToWwwRedirect from "@/app/components/ApexToWwwRedirect";
import OptimizedListingFlow from "@/app/components/OptimizedListingFlow";
import PublishListingAuthGate from "@/app/components/PublishListingAuthGate";

export default function Page() {
  return (
    <>
      <ApexToWwwRedirect />
      <Navbar />
      <PublishListingAuthGate>
        <OptimizedListingFlow />
      </PublishListingAuthGate>
    </>
  );
}
