import React, { Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import ListingsView from "@/app/components/ListingsView";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0A0B14] relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <Navbar />
      <div className="relative z-10">
        <Suspense fallback={<div className="p-8 text-center text-gray-300">Loading...</div>}>
          <ListingsView />
        </Suspense>
      </div>
    </div>
  );
}
