import React from "react";
import Navbar from "@/app/components/Navbar";
import CreateListingFormNew from "@/app/components/CreateListingFormNew";

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <CreateListingFormNew />
        </div>
      </main>
    </>
  );
}
