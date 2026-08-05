"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";

type SeoStatusPayload = {
  generatedAt: string;
  dbOk: boolean;
  origin: string;
  sitemaps: Record<string, unknown>;
  robots: { path: string; note: string };
  integrations: Array<{
    id: string;
    label: string;
    status: string;
    configured: boolean;
    detail: string;
  }>;
  searchConsole: {
    status: string;
    message?: string;
  };
  notes: string[];
};

function statusColor(status: string): string {
  switch (status) {
    case "OK":
      return "text-emerald-300";
    case "WARNING":
    case "MANUAL_ACTION_REQUIRED":
    case "PROVIDER_UNCONFIRMED":
      return "text-amber-300";
    case "ERROR":
      return "text-red-300";
    case "NOT_CONFIGURED":
    case "OUT_OF_SCOPE":
    case "IMPLEMENTED_UNCONFIGURED":
    case "BLOCKED_BY_CREDENTIALS":
      return "text-zinc-400";
    default:
      return "text-zinc-300";
  }
}

export default function AdminSeoPage() {
  const { isAuthorized, isLoading } = useAdminAuth();
  const [data, setData] = useState<SeoStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/seo/status", { credentials: "include" });
        if (!res.ok) {
          throw new Error(res.status === 401 || res.status === 403 ? "Neautorizat" : "Eroare status SEO");
        }
        const json = (await res.json()) as SeoStatusPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Eroare");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-zinc-300">
        Se verifică accesul…
      </main>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-zinc-100">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO &amp; discovery</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Status read-only. Nu inventăm metrici Search Console sau trafic.
          </p>
        </div>
        <Link href="/admin/dashboard" className="text-sm text-cyan-300 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="text-sm text-zinc-400">Se încarcă statusul…</p>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Baseline</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Origin canonic</dt>
                <dd className="font-mono text-zinc-200">{data.origin}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Generat</dt>
                <dd className="font-mono text-zinc-200">{data.generatedAt}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">DB</dt>
                <dd className={data.dbOk ? "text-emerald-300" : "text-red-300"}>
                  {data.dbOk ? "OK" : "ERROR"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Listings indexabile</dt>
                <dd className="font-mono text-zinc-200">
                  {String(data.sitemaps.indexableListings ?? "—")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Integrări</h2>
            <ul className="mt-3 divide-y divide-zinc-800">
              {data.integrations.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-zinc-100">{row.label}</p>
                    <p className="text-xs text-zinc-500">{row.detail}</p>
                  </div>
                  <p className={`shrink-0 text-xs font-semibold uppercase ${statusColor(row.status)}`}>
                    {row.status.replaceAll("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Search Console
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Status:{" "}
              <span className={statusColor(data.searchConsole.status)}>
                {data.searchConsole.status}
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {data.searchConsole.message || "Date indisponibile până la configurare."}
            </p>
          </section>

          <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Sitemaps</h2>
            <ul className="mt-3 space-y-1 font-mono text-xs text-cyan-200/90">
              {["index", "categories", "cities", "listingsIndex", "autoHubs", "imagesIndex"].map(
                (k) => (
                  <li key={k}>{String(data.sitemaps[k] ?? "")}</li>
                )
              )}
            </ul>
            <p className="mt-3 text-xs text-zinc-500">{data.robots.note}</p>
            <p className="mt-1 font-mono text-xs text-zinc-400">{data.robots.path}</p>
          </section>

          <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Note</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
              {data.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
