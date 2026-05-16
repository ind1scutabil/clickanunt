"use client";
import React, { useState } from "react";
import { getCsrfToken } from "@/lib/security/csrf-client";

export default function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMessage("User created: " + data.email);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setMessage(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 600, padding: 12 }}>
      <h2>Create User</h2>
      <div>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          minLength={8}
          required 
        />
      </div>
      <div>
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="dealer">dealer</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
      </div>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </form>
  );
}
