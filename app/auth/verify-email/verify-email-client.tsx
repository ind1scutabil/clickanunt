"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { broadcastAuthSessionChanged } from "@/lib/auth-session-events";

type Status =
  | "idle"
  | "verifying"
  | "success"
  | "already"
  | "error"
  | "resending";

function stripTokenFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token") && !url.searchParams.has("code")) return;
  url.searchParams.delete("token");
  url.searchParams.delete("code");
  url.searchParams.delete("email");
  window.history.replaceState({}, "", url.pathname + (url.search || ""));
}

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const started = useRef(false);

  const runVerify = useCallback(async (token: string) => {
    setStatus("verifying");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        alreadyVerified?: boolean;
        success?: boolean;
      };
      stripTokenFromUrl();
      if (res.ok && data.success) {
        setStatus(data.alreadyVerified ? "already" : "success");
        setMessage(
          data.message ||
            (data.alreadyVerified
              ? "Emailul era deja verificat."
              : "Email verificat cu succes.")
        );
        broadcastAuthSessionChanged();
        return;
      }
      setStatus("error");
      setMessage(
        data.error ||
          "Linkul de verificare este invalid sau a expirat. Poți solicita unul nou."
      );
    } catch {
      stripTokenFromUrl();
      setStatus("error");
      setMessage("Nu am putut verifica emailul. Încearcă din nou.");
    }
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
    if (!token || started.current) return;
    started.current = true;
    void runVerify(token);
  }, [searchParams, runVerify]);

  async function handleResend() {
    if (resendBusy) return;
    setResendBusy(true);
    setStatus("resending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(email.trim() ? { email: email.trim() } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (res.status === 429) {
        setStatus("error");
        setMessage(data.error || "Prea multe încercări. Încearcă mai târziu.");
        return;
      }
      setStatus("idle");
      setMessage(
        data.message ||
          "Dacă adresa există și nu este verificată, vei primi un email cu instrucțiuni."
      );
    } catch {
      setStatus("error");
      setMessage("Cererea nu a putut fi trimisă. Încearcă mai târziu.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {message && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === "success" || status === "already"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : status === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-zinc-700 bg-zinc-900 text-gray-300"
          }`}
        >
          {message}
        </div>
      )}

      {status === "verifying" && (
        <p className="text-center text-gray-400">Se verifică linkul…</p>
      )}

      {(status === "success" || status === "already") && (
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500"
        >
          Continuă în dashboard
        </button>
      )}

      {(status === "idle" || status === "error" || status === "resending") && (
        <div className="space-y-3">
          <label className="block text-sm text-gray-300">
            Email (opțional, pentru retrimitere)
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
              disabled={resendBusy}
            />
          </label>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendBusy}
            className="w-full rounded-xl bg-zinc-800 px-4 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {resendBusy ? "Se trimite…" : "Retrimite emailul de verificare"}
          </button>
        </div>
      )}
    </div>
  );
}
