import LoginForm from "@/app/components/LoginForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autentificare — ClickAnunț",
  robots: "noindex, nofollow",
};

// Force no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030304] px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.08),transparent_58%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        {/* Back button */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-orange-300/95 transition-smooth hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
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
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] p-8 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.045]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" aria-hidden />
          <div className="relative mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/70 bg-zinc-900/80 text-2xl shadow-inner">
              📦
            </div>
            <h1 className="text-center text-2xl font-black text-white">
              ClickAnunț
            </h1>
          </div>

          <h2 className="relative mb-8 text-center text-2xl font-bold text-white">
            Autentificare
          </h2>
          
          <LoginForm />

          <p className="text-center text-[#C7CCD6] mt-6">
            Nu ai cont?{" "}
            <Link 
              href="/auth/signup" 
            className="font-semibold text-orange-300/95 transition-smooth hover:text-amber-200"
            >
              Creează cont nou
            </Link>
          </p>
        </div>
        <p className="mt-8 text-center text-sm text-[#9AA3B2]">
          Folosește emailul și parola asociate contului tău ClickAnunț.
        </p>
      </div>
    </div>
  );
}
