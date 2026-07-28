"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type MeLite = { emailVerified?: boolean; email?: string } | null;

/**
 * Soft banner — does not block login or product actions.
 */
export default function EmailVerificationBanner() {
  const [me, setMe] = useState<MeLite>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (!res.ok) {
        setMe(null);
        return;
      }
      const data = (await res.json()) as MeLite;
      setMe(data);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (hidden || !me || me.emailVerified) {
    return null;
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (res.status === 429) {
        setNote(data.error || "Prea multe încercări. Încearcă mai târziu.");
      } else {
        setNote(
          data.message ||
            "Dacă adresa există și nu este verificată, vei primi un email cu instrucțiuni."
        );
      }
    } catch {
      setNote("Cererea nu a putut fi trimisă.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium">Email neverificat</p>
        <p className="text-amber-100/80">
          Confirmă {me.email || "adresa"} pentru a crește încrederea contului.
          Poți folosi platforma și fără verificare.
        </p>
        {note && <p className="mt-1 text-amber-50/90">{note}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {busy ? "…" : "Retrimite"}
        </button>
        <Link
          href="/auth/verify-email"
          className="rounded-lg bg-zinc-800 px-3 py-2 font-semibold text-white hover:bg-zinc-700"
        >
          Detalii
        </Link>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="rounded-lg px-3 py-2 text-amber-100/70 hover:text-white"
          aria-label="Ascunde banner"
        >
          Ascunde
        </button>
      </div>
    </div>
  );
}
