"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy signup form (unused by /auth/register — SignupFormExtended is active).
 * Kept free of verification codes in URLs.
 */
export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!email || !password || !confirmPassword) {
        throw new Error("Toate câmpurile sunt necesare");
      }
      if (!email.includes("@")) {
        throw new Error("Email invalid");
      }
      if (password.length < 8) {
        throw new Error("Parola trebuie sa aiba cel putin 8 caractere");
      }
      if (password !== confirmPassword) {
        throw new Error("Parolele nu se potrivesc");
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          name: email.split("@")[0],
          confirmPassword,
          acceptTerms: true,
          acceptPrivacy: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Eroare la crearea contului");
      }

      setMessageType("success");
      setMessage(
        data.emailDispatchAccepted
          ? "Cont creat. Verifică-ți emailul pentru confirmare."
          : "Cont creat. Poți solicita mai târziu un email de verificare."
      );
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            messageType === "success"
              ? "bg-green-500/10 text-green-600"
              : "bg-red-500/10 text-red-600"
          }`}
        >
          {message}
        </div>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border px-4 py-2"
        placeholder="exemplu@email.com"
        required
        disabled={loading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border px-4 py-2"
        placeholder="Parolă"
        required
        disabled={loading}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full rounded-lg border px-4 py-2"
        placeholder="Confirmă parola"
        required
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Se creează…" : "Creează cont"}
      </button>
    </form>
  );
}
