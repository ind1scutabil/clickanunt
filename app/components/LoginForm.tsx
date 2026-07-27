"use client";

import { getCsrfToken } from "@/lib/security/csrf-client";
import { isAdminStaffRole } from "@/lib/is-admin-staff-client";
import { broadcastAuthSessionChanged } from "@/lib/auth-session-events";
import { sanitizeAuthReturnPath } from "@/lib/auth/safe-auth-return-path";
import {
  cacheWebUserProfile,
  clearLegacyWebAuthStorage,
} from "@/lib/auth/clear-legacy-web-auth-storage";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args);
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [requiresTwoFA, setRequiresTwoFA] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  function postLoginPath(role: string | undefined): string {
    const safeNext = sanitizeAuthReturnPath(searchParams.get("next"));
    if (safeNext) return safeNext;
    if (isAdminStaffRole(role)) return "/admin/dashboard";
    return "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Dacă suntem în procesul de 2FA, verifica codul
    if (requiresTwoFA && sessionToken) {
      return handle2FASubmit();
    }

    devLog('[LOGIN] Starting login process...');

    try {
      // Cookie-first: strip any legacy JWT mirrors before login
      clearLegacyWebAuthStorage({ broadcast: false });
      devLog('[LOGIN] Cleared legacy localStorage auth');

      devLog('[LOGIN] Making API call...');

      const csrfToken = await getCsrfToken();
      
      devLog('[LOGIN] Sending login request');
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      devLog('[LOGIN] API response status:', res.status);

      const data = await res.json();

      devLog('[LOGIN] API response data:', data);

      // Verifică dacă necesită 2FA
      if (res.status === 206 && data.requiresTwoFactor) {
        devLog('[LOGIN] 2FA required for admin user');
        setRequiresTwoFA(true);
        setSessionToken(data.sessionToken);
        setMessageType("success");
        const apiMessage = data?.error?.message ?? data?.error ?? data?.message;
        if (apiMessage) {
          setMessage(apiMessage);
        }
        setLoading(false);
        return;
      }

      if (res.status !== 200) {
        const apiMessage = data?.error?.message ?? data?.error ?? data?.message;
        const statusMessages: Record<number, string> = {
          401: "Email sau parolă incorectă",
          403: "Acces interzis",
          429: "Prea multe încercări. Încearcă mai târziu.",
        };
        const mapped = statusMessages[res.status];
        const finalMessage = apiMessage || mapped || null;
        if (finalMessage) {
          setMessageType("error");
          setMessage(finalMessage);
        }
        setLoading(false);
        return;
      }

      // Cookies HttpOnly are set by the API. Never mirror access/refresh into localStorage.
      clearLegacyWebAuthStorage({ broadcast: false });
      if (data.user && typeof data.user === "object") {
        cacheWebUserProfile(data.user as { id?: string; email?: string; role?: string; name?: string | null });
      }
      broadcastAuthSessionChanged();

      const dest = postLoginPath(data.user?.role);
      devLog('[LOGIN] Redirecting to', dest);
      router.push(dest);
    } catch (err: unknown) {
      console.error('[LOGIN] Error:', err);
      if (err instanceof Error && err.message) {
        setMessageType("error");
        setMessage(err.message);
      }
      setLoading(false);
    }
  }

  async function handle2FASubmit() {
    try {
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      devLog('[2FA] Verifying 2FA code...');

      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          sessionToken,
          code: twoFACode,
        }),
      });

      const data = await res.json();

      if (res.status !== 200) {
        const apiMessage = data?.error?.message ?? data?.error ?? data?.message;
        const statusMessages: Record<number, string> = {
          401: "Cod 2FA invalid",
          403: "Acces interzis",
          429: "Prea multe încercări. Încearcă mai târziu.",
        };
        const mapped = statusMessages[res.status];
        const finalMessage = apiMessage || mapped || null;
        if (finalMessage) {
          setMessageType("error");
          setMessage(finalMessage);
        }
        setLoading(false);
        return;
      }

      // Cookies set by API — do not store JWTs in localStorage
      clearLegacyWebAuthStorage({ broadcast: false });
      if (data.user && typeof data.user === "object") {
        cacheWebUserProfile(data.user as { id?: string; email?: string; role?: string; name?: string | null });
      }

      broadcastAuthSessionChanged();

      const dest = postLoginPath(data.user?.role);
      devLog('[2FA] 2FA verification successful →', dest);
      router.push(dest);
    } catch (err: unknown) {
      console.error('[2FA] Error:', err);
      if (err instanceof Error && err.message) {
        setMessageType("error");
        setMessage(err.message);
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!requiresTwoFA ? (
        <>
          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="exemplu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
              Parola
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <div className="mt-2 text-right">
              <a
                href="/auth/forgot-password"
                className="text-sm font-medium text-orange-300/95 transition-smooth hover:text-amber-200"
              >
                Ai uitat parola?
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
            Cod Autentificare cu Doi Factori
          </label>
          <p className="text-sm text-[#9AA3B2] mb-2">
            Introduceți codul din aplicația de autentificare
          </p>
          <input
            type="text"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-transparent transition-smooth text-center text-2xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="000000"
            maxLength={6}
            required
            disabled={loading}
            autoFocus
          />
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            messageType === "success"
              ? "bg-[#064E3B] text-[#6EE7B7] border border-[#10B981]"
              : "bg-[#7F1D1D] text-[#FCA5A5] border border-[#DC2626]"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 font-bold text-white shadow-lg shadow-orange-950/30 transition-smooth hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/35 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (requiresTwoFA ? "Se verifică..." : "Se conectează...") : (requiresTwoFA ? "Verifică codul" : "Conectează-te")}
      </button>

      {requiresTwoFA && (
        <button
          type="button"
          onClick={() => {
            setRequiresTwoFA(false);
            setSessionToken(null);
            setTwoFACode("");
            setMessage(null);
          }}
          className="w-full h-11 rounded-lg font-semibold text-orange-300/95 transition-smooth hover:bg-white/5 hover:text-amber-200"
        >
          Înapoi la conectare
        </button>
      )}
    </form>
  );
}
