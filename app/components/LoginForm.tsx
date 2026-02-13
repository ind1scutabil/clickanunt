"use client";

import { getCsrfToken } from "@/lib/security/csrf-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Dacă suntem în procesul de 2FA, verifica codul
    if (requiresTwoFA && sessionToken) {
      return handle2FASubmit();
    }

    console.log('[LOGIN] Starting login process...');

    try {
      // Clear any existing session first
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      console.log('[LOGIN] Cleared existing session');

      console.log('[LOGIN] Making API call...');

      const csrfToken = await getCsrfToken();
      
      console.log('[LOGIN] Sending login request');
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log('[LOGIN] API response status:', res.status);

      const data = await res.json();

      console.log('[LOGIN] API response data:', data);

      // Verifică dacă necesită 2FA
      if (res.status === 206 && data.requiresTwoFactor) {
        console.log('[LOGIN] 2FA required for admin user');
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

      // Salvează tokens în localStorage
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        console.log('[LOGIN] Access token saved');
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
        console.log('[LOGIN] Refresh token saved');
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('[LOGIN] User data saved');
      }

      console.log('[LOGIN] Redirecting to dashboard...');

      if (data.user?.role === 'admin' || data.user?.role === 'owner') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
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

      console.log('[2FA] Verifying 2FA code...');

      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          twoFACode,
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

      // Salvează tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      console.log('[2FA] 2FA verification successful');
      router.push('/admin/dashboard');
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
              className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <div className="mt-2 text-right">
              <a
                href="/auth/forgot-password"
                className="text-sm text-[#6D5BFF] hover:text-[#00D4FF] transition-smooth"
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
            className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth text-center text-2xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="w-full h-11 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#5B4BFF] hover:to-[#00C4FF] disabled:opacity-50 text-white font-bold rounded-lg transition-smooth disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {loading ? (requiresTwoFA ? "Se verifică..." : "Se conecteaza...") : (requiresTwoFA ? "Verifică codul" : "Conecteaza-te")}
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
          className="w-full h-11 text-[#6D5BFF] hover:text-[#00D4FF] font-semibold rounded-lg transition-smooth hover:bg-white/5"
        >
          Înapoi la conectare
        </button>
      )}
    </form>
  );
}
