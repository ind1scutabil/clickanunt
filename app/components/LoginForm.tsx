"use client";

import TurnstileWidget from "@/app/components/TurnstileWidget";
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Router can be used for navigation if needed

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

      if (!email || !password) {
        throw new Error("Email și parola sunt necesare");
      }

      if (!turnstileToken) {
        throw new Error("Verificarea bot este necesară");
      }

      if (!email.includes("@")) {
        throw new Error("Email invalid");
      }

      console.log('[LOGIN] Making API call...');

      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email, password, turnstileToken }),
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
        setMessage("Conectare reușită. Introduceți codul 2FA.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Eroare la conectare");
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
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      console.error('[LOGIN] Error:', err);
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Eroare necunoscuta");
      setLoading(false);
    }
  }

  async function handle2FASubmit() {
    try {
      if (!twoFACode) {
        throw new Error("Codul 2FA este necesar");
      }

      if (!sessionToken) {
        throw new Error("Sesiune expirată, re-încercați");
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

      if (!res.ok) {
        throw new Error(data?.error || "Cod 2FA invalid");
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
      window.location.href = '/admin/dashboard';
    } catch (err: unknown) {
      console.error('[2FA] Error:', err);
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Eroare necunoscuta");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!requiresTwoFA ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="exemplu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Parola
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Cod Autentificare cu Doi Factori
          </label>
          <p className="text-sm text-gray-600 mb-2">
            Introduceți codul din aplicația de autentificare
          </p>
          <input
            type="text"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900 text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            required
            disabled={loading}
            autoFocus
          />
        </div>
      )}

      {!requiresTwoFA && (
        <div className="pt-2">
          <TurnstileWidget onVerify={setTurnstileToken} action="login" />
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            messageType === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
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
          className="w-full text-indigo-600 hover:text-indigo-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Înapoi la conectare
        </button>
      )}
    </form>
  );
}
