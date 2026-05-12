import SignupFormExtended from "@/app/components/SignupFormExtended";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register - ClickAnunț",
  robots: "noindex, nofollow",
};

// Force no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Back button */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2.5 text-indigo-300 hover:text-white font-semibold transition-smooth hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Înapoi acasă
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#171b22] shadow-[0_20px_48px_-28px_rgba(0,0,0,0.7)] p-8">
          <div className="mb-8">
            <div className="w-14 h-14 bg-[#222a36] rounded-2xl flex items-center justify-center text-2xl shadow-md mx-auto mb-4 border border-white/10">
              📦
            </div>
            <h1 className="text-2xl font-black text-center text-white">
              ClickAnunț
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Creeaza Cont
          </h2>
          
          <SignupFormExtended />

          <p className="text-center text-[#C7CCD6] mt-6">
            Ai deja cont?{" "}
            <Link 
              href="/auth/login" 
            className="text-indigo-300 hover:text-white font-semibold transition-smooth"
            >
              Conecteaza-te
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-[#9AA3B2] text-sm">
          <p>🔒 Datele tale legale sunt utilizate doar pentru facturare automată și sunt protejate</p>
        </div>
      </div>
    </div>
  );
}
