import LoginForm from "@/app/components/LoginForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - ClickAnunț",
  robots: "noindex, nofollow",
};

// Force no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  const BUILD_ID = Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1117] via-[#1A1D24] to-[#111827] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[#6D5BFF] hover:text-[#00D4FF] font-semibold transition-smooth hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]"
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
        <div className="bg-gradient-to-b from-[#1C212B] to-[#16191F] rounded-2xl border border-white/10 shadow-xl p-8 backdrop-blur-sm">
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] rounded-2xl flex items-center justify-center text-3xl shadow-lg mx-auto mb-4">
              📦
            </div>
            <h1 className="text-2xl font-black text-center text-white">
              ClickAnunț
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Autentificare
          </h2>
          
          <LoginForm />

          <p className="text-center text-[#C7CCD6] mt-6">
            Nu ai cont?{" "}
            <Link 
              href="/auth/signup" 
              className="text-[#6D5BFF] hover:text-[#00D4FF] font-semibold transition-smooth"
            >
              Creeaza cont nou
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-[#9AA3B2] text-sm">
          <p>Demo: Foloseste orice email pentru a te conecta</p>
          <p className="mt-2 text-xs opacity-50">
            build: {BUILD_ID}
          </p>
        </div>
      </div>
    </div>
  );
}
