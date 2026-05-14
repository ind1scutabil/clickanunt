"use client";

import { useMemo, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { useRouter } from "next/navigation";
import { broadcastAuthSessionChanged } from "@/lib/auth-session-events";

/** Mirrors lib/security/validation-schemas passwordSchema for client-side enable/disable */
function meetsPasswordRules(p: string): boolean {
  if (p.length < 8 || p.length > 128) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/\d/.test(p)) return false;
  if (!/[!@#$%^&*]/.test(p)) return false;
  return true;
}

const PHONE_RE = /^[0-9+\-\s().]{7,32}$/;

const BUSINESS_CATEGORY_OPTIONS = [
  { value: "auto_dealer", label: "Dealer auto" },
  { value: "real_estate", label: "Agenție imobiliară" },
  { value: "retail", label: "Magazin" },
  { value: "services", label: "Servicii" },
  { value: "other", label: "Altul" },
] as const;

type AccountKind = "personal" | "business";

export default function SignupFormExtended() {
  const [accountKind, setAccountKind] = useState<AccountKind>("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCUI, setBusinessCUI] = useState("");
  const [businessRegCom, setBusinessRegCom] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  const emailOk = useMemo(() => {
    const t = email.trim();
    if (t.length < 3 || t.length > 255) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }, [email]);

  const canSubmit = useMemo(() => {
    if (password !== confirmPassword) return false;
    if (!meetsPasswordRules(password)) return false;
    if (!emailOk) return false;

    if (accountKind === "personal") {
      return name.trim().length >= 2;
    }

    return (
      name.trim().length >= 2 &&
      businessName.trim().length >= 2 &&
      businessCUI.trim().length >= 1 &&
      businessRegCom.trim().length >= 2 &&
      businessPhone.trim().length >= 1 &&
      PHONE_RE.test(businessPhone.trim()) &&
      businessLocation.trim().length >= 2 &&
      Boolean(businessCategory)
    );
  }, [
    accountKind,
    password,
    confirmPassword,
    emailOk,
    name,
    businessName,
    businessCUI,
    businessRegCom,
    businessPhone,
    businessLocation,
    businessCategory,
  ]);

  async function postJson(url: string, body: Record<string, unknown>) {
    const csrfToken = await getCsrfToken();
    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(body),
    });
  }

  function readErrorMessage(data: unknown, res: Response): string | null {
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    const err = d.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "message" in err) {
      const m = (err as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    if (typeof d.message === "string") return d.message;
    const statusMessages: Record<number, string> = {
      401: "Neautorizat",
      403: "Acces interzis",
      409: "Un cont cu acest email există deja",
      429: "Prea multe încercări. Încearcă mai târziu.",
    };
    return statusMessages[res.status] ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      if (password !== confirmPassword) {
        setMessageType("error");
        setMessage("Parolele nu coincid");
        return;
      }

      if (accountKind === "personal") {
        const res = await postJson("/api/auth/register", {
          email,
          password,
          name,
          confirmPassword,
          acceptTerms: true,
          acceptPrivacy: true,
        });

        const data: unknown = await res.json().catch(() => null);

        if (res.status !== 200) {
          const finalMessage = readErrorMessage(data, res) ?? "Înregistrarea a eșuat. Încearcă din nou.";
          setMessageType("error");
          setMessage(finalMessage);
          return;
        }

        const ok = data as Record<string, unknown>;
        if (typeof ok.accessToken === "string") {
          localStorage.setItem("accessToken", ok.accessToken);
        }
        if (typeof ok.refreshToken === "string") {
          localStorage.setItem("refreshToken", ok.refreshToken);
        }
        if (ok.user) {
          localStorage.setItem("user", JSON.stringify(ok.user));
        }
        broadcastAuthSessionChanged();

        router.push("/dashboard");
        return;
      }

      const res = await postJson("/api/auth/register-extended", {
        email,
        password,
        confirmPassword,
        accountType: "business",
        name,
        acceptTerms: true,
        acceptPrivacy: true,
        businessName,
        businessCUI,
        businessRegCom,
        businessPhone,
        businessEmail: "",
        businessLocation,
        businessWebsite: businessWebsite.trim() || "",
        businessCategory,
        businessDescription: businessDescription.trim() || "",
      });

      const data: unknown = await res.json().catch(() => null);

      if (res.status !== 200) {
        const finalMessage = readErrorMessage(data, res) ?? "Înregistrarea firmă a eșuat. Verifică câmpurile și încearcă din nou.";
        setMessageType("error");
        setMessage(finalMessage);
        return;
      }

      const ok = data as Record<string, unknown>;
      if (typeof ok.accessToken === "string") {
        localStorage.setItem("accessToken", ok.accessToken);
      }
      if (typeof ok.refreshToken === "string") {
        localStorage.setItem("refreshToken", ok.refreshToken);
      }
      if (ok.user) {
        localStorage.setItem("user", JSON.stringify(ok.user));
      }
      broadcastAuthSessionChanged();

      setMessageType("success");
      setMessage(
        typeof ok.message === "string"
          ? ok.message
          : "Cont business creat. Redirecționare către panou…"
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setMessageType("error");
        setMessage(err.message);
      } else {
        setMessageType("error");
        setMessage("Eroare de rețea. Încearcă din nou.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-transparent transition-smooth";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-[#3F4654] bg-[#1B2029]/80 p-4 shadow-inner shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9AA3B2] mb-3">
          Tip cont
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setAccountKind("personal");
              setMessage(null);
              setMessageType(null);
            }}
            className={`text-left rounded-lg border p-4 transition-smooth ${
              accountKind === "personal"
                ? "border-orange-500/80 bg-[#242A36] ring-1 ring-orange-500/40"
                : "border-[#3F4654] bg-[#1B2029] hover:border-[#5B6574]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#F3F4F6]">Cont personal</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA3B2]">
                Implicit
              </span>
            </div>
            <p className="mt-2 text-sm text-[#9AA3B2] leading-snug">
              Pentru cumpărători și vânzători ocazionali.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountKind("business");
              setMessage(null);
              setMessageType(null);
            }}
            className={`text-left rounded-lg border p-4 transition-smooth relative overflow-hidden ${
              accountKind === "business"
                ? "border-amber-500/80 bg-[#242A36] ring-1 ring-amber-500/35"
                : "border-[#3F4654] bg-[#1B2029] hover:border-[#5B6574]"
            }`}
          >
            <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-500/25 to-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 border border-amber-500/30">
              Business
            </div>
            <div className="pr-16">
              <span className="font-semibold text-[#F3F4F6]">Firmă / dealer auto</span>
              <p className="mt-2 text-sm text-[#9AA3B2] leading-snug">
                Pentru dealeri și firme care publică mai multe anunțuri.
              </p>
            </div>
          </button>
        </div>
      </div>

      {accountKind === "business" && (
        <div className="rounded-xl border border-[#3F4654] bg-[#1B2029]/90 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#E5E7EB]">Date firmă</h3>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Nume firmă</label>
            <input
              type="text"
              name="businessName"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
              placeholder="Ex: AUTO DEALER SRL"
              required={accountKind === "business"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">CUI / CIF</label>
              <input
                type="text"
                name="businessCUI"
                value={businessCUI}
                onChange={(e) => setBusinessCUI(e.target.value)}
                className={inputClass}
                placeholder="RO12345678"
                required={accountKind === "business"}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Nr. Reg. Com.</label>
              <input
                type="text"
                name="businessRegCom"
                value={businessRegCom}
                onChange={(e) => setBusinessRegCom(e.target.value)}
                className={inputClass}
                placeholder="J12/1234/2020"
                required={accountKind === "business"}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Telefon firmă</label>
            <input
              type="tel"
              name="businessPhone"
              autoComplete="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className={inputClass}
              placeholder="+40 7xx xxx xxx"
              required={accountKind === "business"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Oraș / județ</label>
            <input
              type="text"
              name="businessLocation"
              value={businessLocation}
              onChange={(e) => setBusinessLocation(e.target.value)}
              className={inputClass}
              placeholder="Ex: București, Sector 1"
              required={accountKind === "business"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
              Website <span className="text-[#9AA3B2] font-normal">(opțional)</span>
            </label>
            <input
              type="url"
              name="businessWebsite"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
              className={inputClass}
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Tip activitate</label>
            <select
              name="businessCategory"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer`}
              required={accountKind === "business"}
            >
              <option value="">Selectează…</option>
              {BUSINESS_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
              Detalii opționale
            </label>
            <textarea
              name="businessDescription"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 min-h-[88px] bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-transparent transition-smooth resize-y"
              placeholder="Scurtă descriere a activității (opțional)"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
            {accountKind === "business" ? "Persoană de contact" : "Nume"}
          </label>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={accountKind === "business" ? "Nume și prenume" : "Numele tău"}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Email</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="exemplu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Parola</label>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            required
            minLength={8}
          />
          <p className="text-xs text-[#9AA3B2] mt-1">
            Minim 8 caractere, inclusiv o literă mare, o cifră și un simbol special{" "}
            <span className="font-mono text-[#C9D1DD]">!@#$%^&*</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Confirmă parola</label>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
      </div>

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
        disabled={loading || !canSubmit}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 font-bold text-white shadow-lg shadow-orange-950/30 transition-smooth hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/35 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Se creează contul…" : accountKind === "business" ? "Creează cont business" : "Creează cont"}
      </button>

      <p className="text-center text-sm text-[#9AA3B2]">
        Ai deja cont?{" "}
        <a href="/auth/login" className="font-medium text-orange-300/95 transition-smooth hover:text-amber-200">
          Conectează-te
        </a>
      </p>
    </form>
  );
}
