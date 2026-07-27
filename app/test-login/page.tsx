"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearLegacyWebAuthStorage } from "@/lib/auth/clear-legacy-web-auth-storage";

/**
 * Dev-only stub page — does NOT mint real JWTs into localStorage.
 * Cookie-first auth: use /auth/login for real sessions.
 */
export default function TestLoginPage() {
  const router = useRouter();

  useEffect(() => {
    clearLegacyWebAuthStorage({ broadcast: false });
    console.log("test-login: legacy auth storage cleared; redirecting to /auth/login");
    const t = setTimeout(() => {
      router.push("/auth/login");
    }, 500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Test Login</h1>
        <p className="text-gray-300">Redirect toward real cookie-based login…</p>
      </div>
    </div>
  );
}
