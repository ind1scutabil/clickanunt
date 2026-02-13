import React, { Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0F1117]">
      
      <Navbar />
      <div className="relative">
        <Suspense fallback={<div className="p-8 text-center text-gray-300">Loading...</div>}>
          <ListingsView />
        </Suspense>
      </div>
    </div>
  );
}
