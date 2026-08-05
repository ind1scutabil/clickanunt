import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import VerifyEmailClient from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verificare email — ClickAnunț",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-xl">
          <h1 className="mb-2 text-center text-2xl font-bold text-white">
            Verificare email
          </h1>
          <p className="mb-6 text-center text-sm text-gray-400">
            Confirmă adresa folosind linkul din email. Loginul rămâne disponibil
            și fără verificare.
          </p>
          <Suspense
            fallback={
              <p className="text-center text-gray-400">Se încarcă…</p>
            }
          >
            <VerifyEmailClient />
          </Suspense>
          <div className="mt-8 flex flex-col gap-2 text-center text-sm">
            <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300">
              Dashboard
            </Link>
            <Link href="/auth/login" className="text-gray-500 hover:text-gray-300">
              Autentificare
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
