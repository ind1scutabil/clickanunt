"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "user" | "dealer";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validation
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

      // Create user account
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Eroare la crearea contului");
      }

      // Dacă suntem în development mode și avem cod de verificare
      if (data.verificationCode) {
        setMessageType("success");
        setMessage(`✅ Cont creat! Codul tău de verificare este: ${data.verificationCode}`);
        
        // Redirect cu codul în URL pentru auto-fill
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&code=${data.verificationCode}`);
        }, 3000);
      } else {
        setMessageType("success");
        setMessage("✅ Cont creat cu succes! Verifică-ți emailul pentru a activa contul...");
        
        // Redirect to verification page
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }, 2000);
      }
    } catch (err: unknown) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="Minim 8 caractere"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Confirma Parola
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
          placeholder="••••••••"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Tip de Cont
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="user"
              checked={role === "user"}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-900 font-medium">
              Utilizator Particular - Cumpăr și vând ocazional
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="dealer"
              checked={role === "dealer"}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-900 font-medium">
              Profesionist/Firmă - Vând în mod regulat
            </span>
          </label>
        </div>
      </div>

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
        {loading ? "Se creeaza cont..." : "Creează cont"}
      </button>
    </form>
  );
}
