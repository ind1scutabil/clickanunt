import React from "react";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ListingsView />
    </div>
  );
}
