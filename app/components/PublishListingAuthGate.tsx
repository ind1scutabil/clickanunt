"use client";

/**
 * Group 3 — publish auth gate.
 *
 * Investigation (no safe cross-login draft):
 * - OptimizedListingFlow clears localStorage draft on normal /listings/new visits;
 * - server drafts require auth; anonymous /api/uploads is not a private draft;
 * - LoginForm previously ignored ?next=, so users never returned to publish.
 *
 * Therefore: require auth before rendering the form; return only to /listings/new.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { validateServerAuthSession } from "@/lib/admin-fetch";

const LOGIN_HREF = "/auth/login?next=%2Flistings%2Fnew";

export default function PublishListingAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await validateServerAuthSession();
      if (cancelled) return;
      if (!result.ok) {
        router.replace(LOGIN_HREF);
        return;
      }
      setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-16"
        aria-busy="true"
        aria-label="Autentificare necesară pentru publicare"
      >
        <div className="h-10 max-w-sm animate-pulse rounded-lg bg-zinc-800/60" />
        <div className="mt-6 space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-zinc-800/45" />
          <div className="h-24 animate-pulse rounded-xl bg-zinc-800/35" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
