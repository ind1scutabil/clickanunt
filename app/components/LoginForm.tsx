"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // For demo purposes, we'll create a simple login simulation
      // In production, you'd hash the password and verify against the database
      if (!email || !password) {
        throw new Error("Email și parola sunt necesare");
      }

      if (!email.includes("@")) {
        throw new Error("Email invalid");
      }

      // Make API call to login
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Eroare la conectare");
      }

      // Store token if provided
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      setMessageType("success");
      setMessage("Conectat cu succes!");
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setMessageType("error");
      setMessage(err.message || "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          placeholder="exemplu@email.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parola
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          placeholder="••••••••"
          required
        />
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
        {loading ? "Se conecteaza..." : "Conecteaza-te"}
      </button>
    </form>
  );
}
