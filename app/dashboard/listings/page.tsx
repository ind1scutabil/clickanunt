"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { memoryStorage } from "@/lib/memory-storage";
import { fetchWithAuthRefresh } from "@/lib/admin-fetch";
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import {
  formatListingExpiryDateRO,
  formatListingExpiryDisplay,
  isListingDateExpired,
} from "@/lib/listing-expiry";

/** Token-uri vizuale — doar această pagină. */
const pageAmbient =
  "pointer-events-none absolute inset-0 overflow-hidden";
const ctaPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-500 hover:shadow-orange-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-11 sm:px-6";
const panelSurface =
  "relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045]";
const tabBar =
  "flex flex-wrap gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] shadow-black/40 backdrop-blur-md";
const listingRowSurface =
  "group relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/95 p-5 shadow-md shadow-black/30 ring-1 ring-white/[0.04] transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_0_32px_-12px_rgba(249,115,22,0.1)] sm:p-6";

function formatListingPrice(listing: Record<string, unknown>): string {
  if (listing?.price != null && String(listing.price).trim() !== "") {
    return String(listing.price);
  }
  const amount = listing?.priceAmount as number | undefined;
  const currency = (listing?.priceCurrency as string) || "RON";
  if (typeof amount === "number" && !Number.isNaN(amount)) {
    return `${amount.toLocaleString("ro-RO")} ${currency}`;
  }
  return "Preț la cerere";
}

export default function MyListingsPage() {
  const router = useRouter();
  /** Evită mismatch SSR/client: primul paint nu citește localStorage. */
  const [clientReady, setClientReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "expired" | "draft">("active");
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const getListingTab = (listing: Record<string, unknown>): "active" | "pending" | "expired" | "draft" => {
    const s = String(listing?.status ?? "").toLowerCase();
    const mod = String(listing?.moderationStatus ?? "").toLowerCase();

    if (s === "draft") return "draft";
    if (s === "expired" || s === "sold" || s === "deleted") return "expired";

    if (s === "pending" || mod === "pending" || mod === "flagged") return "pending";
    if (s === "rejected" || s === "hidden" || s === "paused") return "pending";
    if (s === "active" && mod === "rejected") return "pending";

    if (
      s === "active" &&
      isListingDateExpired({
        expiresAt: listing.expiresAt as string | Date | null | undefined,
        createdAt: listing.createdAt as string | Date | null | undefined,
        publishedAt: listing.publishedAt as string | Date | null | undefined,
      })
    ) {
      return "expired";
    }

    if (s === "active") return "active";

    return "pending";
  };

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/dashboard/listings');
      return;
    }

    void fetchListings();
  }, [clientReady, router]);

  const fetchListings = async () => {
    try {
      setFetchError(null);
      setIsLoading(true);
      // Check if we're in in-memory mode
      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === "true";

      if (useInMemory) {
        // Get all listings from memory storage
        const allListings = memoryStorage.getAll();

        // Filter by current user
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const currentUser = JSON.parse(userStr);
          const userListings = allListings.filter((listing: Record<string, unknown>) => {
            const owner = listing.owner as { id?: string; email?: string } | undefined;
            return (
              owner?.id === currentUser.id ||
              owner?.email === currentUser.email ||
              listing.ownerUserId === currentUser.id
            );
          });
          setListings(userListings);
        } else {
          setListings(allListings);
        }
      } else {
        const response = await fetchWithAuthRefresh("/api/listings?userId=me&status=all", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push("/auth/login?redirect=/dashboard/listings");
            return;
          }
          setFetchError("Nu am putut încărca anunțurile. Încearcă din nou.");
          setListings([]);
          return;
        }

        const raw = (await response.json()) as unknown;
        const items = Array.isArray(raw)
          ? raw
          : (raw as { listings?: unknown[]; data?: unknown[] }).listings ||
            (raw as { data?: unknown[] }).data ||
            [];
        setListings((Array.isArray(items) ? items : []) as any[]);
      }
    } catch (err) {
      console.error("Error fetching listings:", err);
      setFetchError("Eroare de rețea la încărcarea anunțurilor.");
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest anunț?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setMessage({ type: 'success', text: 'Anunț șters cu succes' });
      setListings(listings.filter(l => l.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la ștergere' });
    }
  };

  const getCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Error getting CSRF token:', err);
      return null;
    }
  };

  const handlePromote = (id: string, packageId: string) => {
    // Redirect to promotion page where user can choose package and payment method
    router.push(`/listings/${id}/promote`);
  };

  const handleRemovePromotion = async (id: string) => {
    try {
      setIsPromoting(id);
      const token = localStorage.getItem('accessToken');
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/listings/${id}/promote`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove promotion');
      }

      setMessage({ type: 'success', text: 'Promovarea anunțului a fost anulată' });
      
      // Update listing in local state
      setListings(listings.map(l => 
        l.id === id 
          ? { ...l, isPromoted: false, promotionType: null, promotionExpiresAt: null }
          : l
      ));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare la anularea promovării' });
    } finally {
      setIsPromoting(null);
    }
  };

  const filteredListings = listings.filter((listing) => getListingTab(listing) === activeTab);

  return (
    <div
      data-dashboard-surface="listings-v2"
      className="relative min-h-screen bg-[#030304] text-zinc-100 antialiased selection:bg-orange-500/30"
      suppressHydrationWarning
    >
      <div className={pageAmbient}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_-16%,rgba(251,146,60,0.09),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_36%_at_100%_0%,rgba(139,92,246,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_38%_32%_at_0%_100%,rgba(59,130,246,0.04),transparent_48%)]" />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mb-7 h-px w-full bg-gradient-to-r from-transparent via-orange-500/35 to-transparent md:mb-8" aria-hidden />
        {message && (
          <div
            className={`relative mb-6 overflow-hidden rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              message.type === "success"
                ? "border-emerald-500/35 bg-gradient-to-r from-emerald-950/50 to-emerald-950/20 text-emerald-100 ring-emerald-500/15"
                : "border-red-500/35 bg-gradient-to-r from-red-950/50 to-red-950/20 text-red-100 ring-red-500/15"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        <div className="mb-8 flex flex-col gap-6 border-b border-zinc-800/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Spațiu de lucru
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Anunțurile{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                mele
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
              Vizualizare operațională: stări de publicare, moderare și ciorne — sincronizat cu baza de date.
            </p>
          </div>
          <Link href="/listings/new" className={ctaPrimary}>
            <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Anunț nou
          </Link>
        </div>

        <div className={`mb-8 ${tabBar}`}>
          {(["active", "pending", "expired", "draft"] as const).map((tab) => {
            const count = listings.filter((l) => getListingTab(l) === tab).length;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:px-4 ${
                  active
                    ? "bg-gradient-to-b from-zinc-800/95 to-zinc-900 text-white shadow-md ring-1 ring-orange-500/25"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <span className="whitespace-nowrap">
                  {tab === "active" && "Active"}
                  {tab === "pending" && "În așteptare"}
                  {tab === "expired" && "Expirate"}
                  {tab === "draft" && "Ciorne"}
                </span>
                <span
                  className={`min-w-[1.35rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                    active ? "bg-orange-500/20 text-orange-200" : "bg-zinc-950/50 text-zinc-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {!clientReady || isLoading ? (
          <div className={`py-20 text-center sm:py-24 ${panelSurface}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            <div
              className="relative mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-orange-500 shadow-lg shadow-orange-950/20"
              aria-hidden
            />
            <p className="relative mt-4 text-sm font-medium tracking-tight text-zinc-500">Se încarcă anunțurile…</p>
          </div>
        ) : fetchError ? (
          <div className="relative overflow-hidden rounded-xl border border-red-900/40 bg-gradient-to-b from-red-950/40 to-red-950/10 px-6 py-12 text-center shadow-lg ring-1 ring-red-500/10">
            <p className="text-sm font-medium text-red-100/95">{fetchError}</p>
            <button
              type="button"
              onClick={() => {
                void fetchListings();
              }}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-zinc-600/80 bg-zinc-950/80 px-5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800/70"
            >
              Reîncearcă
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className={`px-6 py-16 text-center sm:px-10 sm:py-20 ${panelSurface}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
            <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/70 bg-gradient-to-br from-violet-950/60 to-zinc-950 text-violet-300/95 shadow-inner">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="relative text-base font-semibold tracking-tight text-white sm:text-lg">
              {activeTab === "active" && "Niciun anunț activ"}
              {activeTab === "pending" && "Niciun anunț în așteptare"}
              {activeTab === "expired" && "Niciun anunț expirat"}
              {activeTab === "draft" && "Nicio ciornă salvată"}
            </h3>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
              {activeTab === "active" && "Publică primul anunț pentru a apărea în listă și în statistici."}
              {activeTab === "pending" && "Anunțurile în moderare apar aici până la decizie."}
              {activeTab === "expired" && "Anunțurile expirate, vândute sau retrase sunt grupate aici."}
              {activeTab === "draft" && "Ciornele salvate din formularul de publicare apar în această filă."}
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href="/listings/new" className={ctaPrimary}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Anunț nou
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => (
              <div key={listing.id} className={listingRowSurface}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative flex flex-col gap-6 md:flex-row">
                  <div className="h-48 w-full shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-inner md:h-44 md:w-60">
                    <img
                      src={listingPrimaryPhotoSrc(listing.photos, listing.imageUrls)}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.onerror = null;
                        el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                          {listing.title}
                        </h3>
                        <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-200 sm:text-2xl">
                          {formatListingPrice(listing)}
                        </p>
                      </div>
                      {getListingTab(listing) === "active" && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-emerald-900/60 bg-emerald-950/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
                          Activ
                        </span>
                      )}
                      {getListingTab(listing) === "pending" && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-amber-900/60 bg-amber-950/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-300">
                          În așteptare
                        </span>
                      )}
                      {getListingTab(listing) === "expired" && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Expirat
                        </span>
                      )}
                      {getListingTab(listing) === "draft" && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                          Ciornă
                        </span>
                      )}
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-3 text-sm text-zinc-500 md:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span>{listing.views ?? 0} vizualizări</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <span>{listing.messages ?? 0} mesaje</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        Publicat:{" "}
                        {listing.createdAt
                          ? new Date(listing.createdAt as string).toLocaleDateString("ro-RO")
                          : "—"}
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        Expiră:{" "}
                        {formatListingExpiryDisplay({
                          expiresAt: listing.expiresAt as string | null | undefined,
                          createdAt: listing.createdAt as string | null | undefined,
                          publishedAt: listing.publishedAt as string | null | undefined,
                        })}
                      </div>
                      {listing.isPromoted && listing.promotionExpiresAt ? (
                        <div className="col-span-2 text-sm text-amber-400/90 md:col-span-4">
                          Promovare până:{" "}
                          {formatListingExpiryDateRO(listing.promotionExpiresAt as string)}
                        </div>
                      ) : null}
                    </div>

                    {listing.moderationNotes && getListingTab(listing) !== "active" && (
                      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                          Motiv moderare
                        </p>
                        <p className="mt-1 text-sm text-amber-50/95">{String(listing.moderationNotes)}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900 sm:text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Vizualizează
                      </Link>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 text-xs font-medium text-white transition hover:bg-zinc-700 sm:text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editează
                      </Link>
                      {!listing.isPromoted && getListingTab(listing) === "active" && (
                        <button
                          onClick={() => handlePromote(listing.id, 'top')}
                          disabled={isPromoting === listing.id}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-800/80 bg-amber-950/40 px-3 text-xs font-medium text-amber-200 transition hover:bg-amber-950/70 disabled:opacity-50 sm:text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          {isPromoting === listing.id ? 'Se promovează...' : 'Promoveaza'}
                        </button>
                      )}
                      {listing.isPromoted && (
                        <button
                          onClick={() => handleRemovePromotion(listing.id)}
                          disabled={isPromoting === listing.id}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-600 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50 sm:text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          {isPromoting === listing.id ? 'Se procesează...' : 'Anulează promovare'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-900/60 bg-red-950/30 px-3 text-xs font-medium text-red-400 transition hover:bg-red-950/50 sm:text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Șterge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
