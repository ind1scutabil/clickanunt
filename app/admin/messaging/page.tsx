"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";

type DiagnosticsPayload = Record<string, unknown> | null;

export default function AdminMessagingDiagnosticsPage() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useAdminAuth();
  const [data, setData] = useState<DiagnosticsPayload>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchWithAuthRefresh("/api/admin/messaging/diagnostics");
      if (!res.ok) {
        const t = await res.text();
        setErr(`${res.status} ${t.slice(0, 280)}`);
        setData(null);
        return;
      }
      const j = (await res.json()) as Record<string, unknown>;
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthorized) router.push("/");
  }, [router, isAuthorized, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthorized) return;
    void load();
  }, [isLoading, isAuthorized, load]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-gray-400">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-sm text-blue-400/90 hover:text-blue-300 mb-2 inline-block"
            >
              ← Dashboard admin
            </Link>
            <h1 className="text-2xl font-semibold text-white">Mesagerie — diagnostic</h1>
            <p className="mt-1 text-sm text-gray-400">
              Date agregate (read-only): nod curent SSE, Redis, conversații recente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Încarcă..." : "Reîmprospătare"}
          </button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
            {err}
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 overflow-x-auto">
          <pre className="text-[12px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words">
            {data ? JSON.stringify(data, null, 2) : "(fără date)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
