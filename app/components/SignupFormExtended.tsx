"use client";
import { useMemo, useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { useRouter } from "next/navigation";

/** Mirrors lib/security/validation-schemas passwordSchema for client-side enable/disable */
function meetsPasswordRules(p: string): boolean {
  if (p.length < 8 || p.length > 128) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/\d/.test(p)) return false;
  if (!/[!@#$%^&*]/.test(p)) return false;
  return true;
}

/**
 * Simplified SignupFormExtended - temporarily simplified for deployment
 * TODO: Restore full extended functionality (business/personal account types)
 */
export default function SignupFormExtended() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  const canSubmit = useMemo(() => {
    if (password !== confirmPassword) return false;
    if (!meetsPasswordRules(password)) return false;
    return true;
  }, [password, confirmPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (password !== confirmPassword) {
        setMessageType("error");
        setMessage("Parolele nu coincid");
        setLoading(false);
        return;
      }

      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          email,
          password,
          name,
          confirmPassword,
          acceptTerms: true,
          acceptPrivacy: true,
        }),
      });

      const data = await res.json();

      if (res.status !== 200) {
        const apiMessage = data?.error?.message ?? data?.error ?? data?.message;
        const statusMessages: Record<number, string> = {
          401: "Neautorizat",
          403: "Acces interzis",
          409: "Un cont cu acest email există deja",
          429: "Prea multe încercări. Încearcă mai târziu.",
        };
        const mapped = statusMessages[res.status];
        const finalMessage = apiMessage || mapped || null;
        if (finalMessage) {
          setMessageType("error");
          setMessage(finalMessage);
        }
        return;
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setMessageType("error");
        setMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
          Nume
        </label>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth"
          placeholder="Numele tău"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth"
          placeholder="exemplu@email.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
          Parola
        </label>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth"
          placeholder="••••••••"
          required
          minLength={8}
        />
        <p className="text-xs text-[#9AA3B2] mt-1">
          Minim 8 caractere, incluзi o literă mare, o cifră și un simbol special
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">
          Confirmă parola
        </label>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 h-11 bg-[#242A36] border border-[#3F4654] rounded-lg text-white placeholder-[#808B9A] focus:outline-none focus:ring-2 focus:ring-[#6D5BFF] focus:border-transparent transition-smooth"
          placeholder="••••••••"
          required
          minLength={8}
        />
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
        className="w-full h-11 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#5B4BFF] hover:to-[#00C4FF] disabled:opacity-50 text-white font-bold rounded-lg transition-smooth disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {loading ? "Se creează contul..." : "Creează cont"}
      </button>

      <p className="text-center text-sm text-[#9AA3B2]">
        Ai deja cont?{" "}
        <a href="/auth/login" className="text-[#6D5BFF] hover:text-[#00D4FF] transition-smooth">
          Conectează-te
        </a>
      </p>
    </form>
  );
}
