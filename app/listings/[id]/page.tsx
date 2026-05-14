'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DEFAULT_LISTING_IMAGE_URL,
  LISTING_PHOTO_ONERROR_FALLBACK,
  normalizeListingPhotoUrl,
  normalizeListingPhotosArray,
} from "@/lib/listing-photo-url";
import { phoneToTelHref, formatPhoneDisplay } from "@/lib/phone-display";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { primarySlugForCategoryLabel } from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";
import { pushRecentListingSnapshot } from "@/lib/recent-listings-storage";

async function trackListingEngagement(
  listingId: string,
  eventType:
    | "listing_contact_click"
    | "listing_phone_click"
    | "listing_whatsapp_click"
) {
  try {
    const csrf = await getCsrfToken();
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ eventType, listingId }),
    });
  } catch {
    /* non-blocking */
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'Utilizator verificat';
  const visible = localPart.length > 2 ? localPart.slice(0, 2) : localPart.slice(0, 1);
  return `${visible}***@${domain}`;
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("inappropriate");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  /** Frontend-only trust chips — labels derived strictly from listing/owner fields already on the payload. */
  const trustPills = useMemo(() => {
    if (!listing) return [] as { key: string; label: string }[];
    const pills: { key: string; label: string }[] = [];
    if (listing.status === "active") pills.push({ key: "active", label: "Anunț activ" });
    if (listing.moderationStatus === "approved") {
      pills.push({ key: "moderation", label: "Verificat pentru publicare" });
    }
    if (listing.owner?.emailVerified) pills.push({ key: "email", label: "Email verificat" });
    if (listing.owner?.phoneVerified) pills.push({ key: "phone", label: "Telefon verificat" });
    const createdRaw = listing.createdAt as string | Date | undefined;
    const createdMs = createdRaw ? new Date(createdRaw).getTime() : 0;
    if (createdMs && Date.now() - createdMs < 14 * 24 * 60 * 60 * 1000) {
      pills.push({ key: "recent", label: "Publicat recent" });
    }
    return pills;
  }, [listing]);

  const photos = useMemo(
    () => normalizeListingPhotosArray(listing?.photos),
    [listing]
  );

  useEffect(() => {
    setSelectedImageIndex(0);
    setShowPhone(false);
  }, [id]);

  useEffect(() => {
    setSelectedImageIndex((i) => {
      if (photos.length === 0) return 0;
      return Math.min(i, photos.length - 1);
    });
  }, [photos.length]);

  /** Mobile gallery: horizontal swipe (modal + hero). Avoids fighting vertical scroll unless gesture is clearly horizontal. */
  const gallerySwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressHeroOpenModalRef = useRef(false);

  const onGallerySwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (photos.length < 2) return;
    const t = e.touches[0];
    if (!t) return;
    gallerySwipeStartRef.current = { x: t.clientX, y: t.clientY };
  }, [photos.length]);

  const onGallerySwipeTouchEnd = useCallback(
    (e: React.TouchEvent, source: "hero" | "modal") => {
      const start = gallerySwipeStartRef.current;
      gallerySwipeStartRef.current = null;
      if (photos.length < 2 || !start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const threshold = 48;
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      if (source === "hero") suppressHeroOpenModalRef.current = true;
      if (dx < 0) {
        setSelectedImageIndex((i) => Math.min(photos.length - 1, i + 1));
      } else {
        setSelectedImageIndex((i) => Math.max(0, i - 1));
      }
    },
    [photos.length]
  );

  const openHeroImageModal = useCallback(() => {
    if (suppressHeroOpenModalRef.current) {
      suppressHeroOpenModalRef.current = false;
      return;
    }
    setShowImageModal(true);
  }, []);

  const clearGallerySwipe = useCallback(() => {
    gallerySwipeStartRef.current = null;
  }, []);

  /** Închide galeria la Escape; z-index modale > .site-header-shell (100) ca butonul X să nu fie sub navbar. */
  useEffect(() => {
    if (!showImageModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowImageModal(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showImageModal]);

  // Check if listing is in favorites
  useEffect(() => {
    if (id) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(id));
    }
  }, [id]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const loadListing = async () => {
      try {
        // Always use the API endpoint - it handles both in-memory and database modes
        const res = await fetch(`/api/listings/${id}`, {
          cache: "no-store",
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setListing(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void loadListing().catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (!listing?.id) return;
    const photos = Array.isArray(listing.photos) ? listing.photos : [];
    pushRecentListingSnapshot({
      id: listing.id,
      title: listing.title,
      priceAmount: listing.priceAmount,
      priceCurrency: listing.priceCurrency ?? "RON",
      photo: typeof photos[0] === "string" ? photos[0] : undefined,
      category: listing.category,
    });
  }, [listing]);

  useEffect(() => {
    const loadSimilarListings = async () => {
      if (!listing?.id || !listing?.category) {
        setSimilarListings([]);
        return;
      }

      setSimilarLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("category", String(listing.category));
        params.set("status", "active");
        params.set("sort", "newest");
        params.set("limit", "20");
        if (listing.make) params.set("make", String(listing.make));
        if (listing.model) params.set("model", String(listing.model));

        const res = await fetch(`/api/listings?${params.toString()}`, {
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          setSimilarListings([]);
          return;
        }

        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        const filtered = rows
          .filter((row: any) => row?.id && row.id !== listing.id)
          .slice(0, 4);
        setSimilarListings(filtered);
      } catch {
        setSimilarListings([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    loadSimilarListings();
  }, [listing?.id, listing?.category, listing?.make, listing?.model]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      // Remove from favorites
      const updated = favorites.filter((fav: string) => fav !== id);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
    } else {
      // Add to favorites
      favorites.push(id);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    if (id) void trackListingEngagement(id, "listing_whatsapp_click");
    const text = encodeURIComponent(`${listing.title} - ${listing.priceAmount} ${listing.priceCurrency}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      alert('Link copiat: ' + window.location.href);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `${listing.title} - ${listing.priceAmount} ${listing.priceCurrency}`,
          url: window.location.href,
        });
      } catch {
        /* user cancelled share sheet */
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 pt-20 pb-16">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="skeleton aspect-video w-full rounded-2xl" />
                <div className="skeleton h-40 w-full rounded-2xl" />
                <div className="skeleton h-48 w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <div className="skeleton h-64 w-full rounded-2xl" />
                <div className="skeleton h-32 w-full rounded-xl" />
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-white/45">Se încarcă anunțul…</p>
          </div>
        </main>
      </>
    );
  }
  
  if (!listing) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Anunț inexistent</h1>
            <p className="text-gray-600 mb-8">Ne pare rău, acest anunț nu mai este disponibil.</p>
            <Link href="/listings" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
              Întoarce-te la anunțuri
            </Link>
          </div>
        </main>
      </>
    );
  }

  const ownerId = listing.ownerUserId || listing.owner?.id;
  const isOwner = Boolean(currentUser?.id && ownerId && currentUser.id === ownerId);
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const listingStatusLower = String(listing?.status ?? "").toLowerCase();
  const listingIsActiveForPromo = listingStatusLower === "active";
  const isAutoListing = listing.category === "Auto, moto și ambarcațiuni";
  const categoryPillarSlug =
    typeof listing.category === "string" ? primarySlugForCategoryLabel(listing.category) : null;
  const seoCategoryHref = categoryPillarSlug
    ? `/${categoryPillarSlug}`
    : `/listings?category=${encodeURIComponent(String(listing.category))}`;
  const seoCityHubHref =
    categoryPillarSlug && listing.city
      ? `/${categoryPillarSlug}/${slugifyRo(listing.city)}`
      : listing.city
        ? `/listings?${new URLSearchParams({
            category: String(listing.category),
            city: listing.city,
          }).toString()}`
        : null;
  const sellerEmail = listing.owner?.email || '';
  const sellerName = listing.owner?.name || '';
  const sellerDisplayName = sellerName || (sellerEmail ? (isOwner || isPrivileged ? sellerEmail : maskEmail(sellerEmail)) : 'Vânzător verificat');
  const sellerInitial = sellerDisplayName.charAt(0).toUpperCase();
  const sellerPhone = (
    listing.contactPhone ||
    listing.owner?.phone ||
    listing.owner?.businessPhone ||
    ""
  ).trim();
  const phoneTelHref = sellerPhone ? phoneToTelHref(sellerPhone) : "";

  const openMessages = () => {
    if (!currentUser?.id) {
      router.push(`/auth/login?returnUrl=${encodeURIComponent(`/listings/${id}/messages`)}`);
      return;
    }
    router.push(`/listings/${id}/messages`);
  };

  const carHistoryBaseUrl = process.env.NEXT_PUBLIC_CARVERTICAL_URL || "https://www.carvertical.com/ro";
  const carHistoryParams = new URLSearchParams();
  if (listing.vin) carHistoryParams.set("vin", String(listing.vin));
  if (listing.make) carHistoryParams.set("make", String(listing.make));
  if (listing.model) carHistoryParams.set("model", String(listing.model));
  if (listing.year) carHistoryParams.set("year", String(listing.year));
  carHistoryParams.set("utm_source", "clickanunt");
  carHistoryParams.set("utm_medium", "listing_page");
  const carHistoryUrl = `${carHistoryBaseUrl}${carHistoryBaseUrl.includes("?") ? "&" : "?"}${carHistoryParams.toString()}`;
  const rarAutoPassUrl = "https://apps.rarom.ro/autopass-client";
  const similarAutoParams = new URLSearchParams();
  similarAutoParams.set("category", "Auto, moto și ambarcațiuni");
  if (listing.make) similarAutoParams.set("make", String(listing.make));
  if (listing.model) similarAutoParams.set("model", String(listing.model));
  const similarAutoUrl = `/listings?${similarAutoParams.toString()}`;
  const avgFuelLPer100km =
    Number(listing.attributes?.avgFuelLPer100km || listing.attributes?.consumption || 7.5) || 7.5;
  const fuelPriceRonPerL = 7.3;
  const kmPerMonth = 1000;
  const monthlyFuelCost = Math.round((kmPerMonth / 100) * avgFuelLPer100km * fuelPriceRonPerL);
  const yearlyTaxEstimate =
    Number(listing.attributes?.yearlyTaxRon || listing.attributes?.impozitAnualRon || 240) || 240;

  const submitReport = async () => {
    if (reportDescription.trim().length < 10) {
      setReportFeedback("Descrierea trebuie să aibă minim 10 caractere.");
      return;
    }
    setReportLoading(true);
    setReportFeedback(null);
    try {
      const csrfToken = await getCsrfToken();
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          listingId: id,
          reason: reportReason,
          description: reportDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Trimiterea raportului a eșuat");
      }
      setReportFeedback(data.message || "Raport trimis. Mulțumim!");
      setReportDescription("");
      setTimeout(() => {
        setShowReportModal(false);
        setReportFeedback(null);
      }, 2000);
    } catch (e: unknown) {
      setReportFeedback(e instanceof Error ? e.message : "Eroare la trimitere");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      
      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[110] flex max-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-black/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm touch-pan-y"
          onClick={() => setShowImageModal(false)}
          role="presentation"
        >
          <button 
            type="button"
            aria-label="Închide galeria foto"
            className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-900/90 text-white shadow-lg ring-1 ring-white/10 transition-all hover:bg-white/15"
            onClick={(e) => {
              e.stopPropagation();
              setShowImageModal(false);
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {photos.length > 1 && (
            <>
              <button 
                type="button"
                aria-label="Poză anterioară"
                className="absolute left-[max(1rem,env(safe-area-inset-left))] top-1/2 z-[120] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-white transition-all hover:bg-white/15 disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={selectedImageIndex === 0}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button 
                type="button"
                aria-label="Poză următoare"
                className="absolute right-[max(4.5rem,calc(env(safe-area-inset-right)+3.5rem))] top-1/2 z-[120] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-white transition-all hover:bg-white/15 disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.min(photos.length - 1, prev + 1));
                }}
                disabled={selectedImageIndex === photos.length - 1}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <div
            className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 touch-manipulation items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onGallerySwipeTouchStart}
            onTouchEnd={(e) => onGallerySwipeTouchEnd(e, "modal")}
            onTouchCancel={clearGallerySwipe}
          >
            <img
              key={`modal-${selectedImageIndex}-${photos[selectedImageIndex] ?? ''}`}
              src={normalizeListingPhotoUrl(photos[selectedImageIndex]) || DEFAULT_LISTING_IMAGE_URL}
              alt={listing.title}
              className="h-auto max-h-[min(88vh,88dvh)] w-full max-w-full object-contain [max-width:100vw] rounded-lg shadow-lg sm:max-h-[90vh]"
              sizes="100vw"
              onError={(e) => {
                const el = e.currentTarget;
                el.onerror = null;
                el.src = LISTING_PHOTO_ONERROR_FALLBACK;
              }}
            />
            <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[120] flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:bottom-6">
              {photos.length > 1 && (
                <div className="rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                  {selectedImageIndex + 1} / {photos.length}
                </div>
              )}
              <button
                type="button"
                className="rounded-full border border-white/15 bg-zinc-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/15"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageModal(false);
                }}
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pb-12 pt-20 max-md:pb-10">
        <div className="mx-auto max-w-7xl px-4 py-6 max-md:px-3 max-md:py-4">
          <div className="grid gap-6 max-md:gap-3 lg:grid-cols-3">
            {/* Main Content - Left/Center Column */}
            <div className="space-y-4 max-md:space-y-3 lg:col-span-2">
              {/* Image Gallery */}
              <div className="relative min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 shadow-sm ring-1 ring-white/[0.03] backdrop-blur-sm md:rounded-2xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent blur-lg" />
                <div 
                  className="group relative aspect-video max-h-[min(48vh,48dvh)] w-full min-w-0 cursor-pointer overflow-hidden bg-gray-900/50 touch-manipulation shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:max-h-[min(52vh,52dvh)] md:max-h-none"
                  onClick={openHeroImageModal}
                  onTouchStart={onGallerySwipeTouchStart}
                  onTouchEnd={(e) => onGallerySwipeTouchEnd(e, "hero")}
                  onTouchCancel={clearGallerySwipe}
                >
                  <img
                    key={`hero-${selectedImageIndex}-${photos[selectedImageIndex] ?? ''}`}
                    src={normalizeListingPhotoUrl(photos[selectedImageIndex]) || DEFAULT_LISTING_IMAGE_URL}
                    alt={listing.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out sm:group-hover:scale-[1.02]"
                    loading="eager"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.onerror = null;
                      el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm rounded-full p-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {photos.length > 1 && (
                  <div
                    className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth bg-gray-900/30 p-2 touch-pan-x [-webkit-overflow-scrolling:touch] sm:gap-2.5 sm:p-3 md:p-4"
                    onTouchStart={clearGallerySwipe}
                  >
                    {photos.map((photo: string, i: number) => (
                      <div 
                        key={`${i}-${photo}`} 
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative h-14 w-14 shrink-0 snap-start overflow-hidden rounded-lg border bg-gray-800 shadow-sm transition-all duration-200 ease-out cursor-pointer sm:h-16 sm:w-16 md:h-20 md:w-20 md:rounded-xl ${
                          selectedImageIndex === i 
                            ? 'border-[#6366F1]/90 ring-1 ring-[#6366F1]/25 shadow-sm shadow-[#6366F1]/10'
                            : 'border-gray-700/50 hover:border-[#6366F1]/50 hover:shadow-sm'
                        }`}
                      >
                        <img
                          key={`thumb-img-${i}-${photo}`}
                          src={normalizeListingPhotoUrl(photo) || DEFAULT_LISTING_IMAGE_URL}
                          alt={`${listing.title} ${i + 1}`}
                          className={`absolute inset-0 h-full w-full object-cover transition ${
                            selectedImageIndex === i ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                          }`}
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.onerror = null;
                            el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title and Price */}
              <div className="relative rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-3.5 shadow-sm ring-1 ring-white/[0.03] backdrop-blur-sm md:rounded-2xl md:p-5">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent md:rounded-2xl" />
                <div className="relative">
                  <div className="mb-3 flex items-start justify-between md:mb-4">
                    <div className="min-w-0 flex-1 pr-2">
                      <h1 className="mb-1 text-lg font-bold leading-snug tracking-tight text-white sm:text-xl md:mb-2 md:text-[1.75rem]">{listing.title}</h1>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 sm:gap-2 sm:text-sm md:text-[0.9375rem]">
                        <span className="inline-block w-2 h-2 shrink-0 bg-[#00D4FF] rounded-full"></span>
                        <Link
                          href={seoCategoryHref}
                          className="text-gray-400 transition-colors hover:text-cyan-300 hover:underline hover:underline-offset-4"
                        >
                          {listing.category}
                        </Link>
                        {listing.subcategory && (
                          <>
                            <span aria-hidden className="text-gray-600">›</span>
                            <span>{listing.subcategory}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {listing.isFeatured && (
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-yellow-500/95 to-orange-500/95 px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                        ⭐ Promovat
                      </span>
                    )}
                  </div>
                  {trustPills.length > 0 && (
                    <div
                      className="mb-3 flex flex-wrap gap-1 md:mb-4 md:gap-1.5"
                      aria-label="Semnale de încredere pentru acest anunț"
                    >
                      {trustPills.map((p) => (
                        <span
                          key={p.key}
                          className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-emerald-50/95 md:px-2.5 md:text-[11px]"
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-zinc-700/45 pt-3 md:pt-4">
                    <div className="min-w-0">
                      <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-50 sm:text-2xl md:text-[1.75rem]">
                        {listing.priceAmount?.toLocaleString()} {listing.priceCurrency}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 md:gap-3">
                    <button 
                      onClick={toggleFavorite}
                      className={`rounded-lg border p-2.5 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] md:rounded-xl md:p-3.5 ${
                        isFavorite 
                          ? 'bg-gradient-to-br from-red-500/95 to-pink-600/95 border-red-400/50 shadow-sm shadow-red-900/20'
                          : 'bg-zinc-800/80 border-zinc-700/50 hover:border-red-500/50 hover:bg-red-500/10'
                      }`}
                      title={isFavorite ? "Elimină din favorite" : "Adaugă la favorite"}
                    >
                      <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill={isFavorite ? "white" : "none"} stroke={isFavorite ? "white" : "currentColor"} strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button 
                      onClick={shareNative}
                      className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-[#00b8d9] to-[#0090b0] p-2.5 transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-sm hover:shadow-cyan-900/25 active:scale-[0.99] md:p-3.5"
                      title="Distribuie"
                    >
                      <svg className="h-5 w-5 text-white md:h-6 md:w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="relative rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-3.5 shadow-sm backdrop-blur-sm md:rounded-2xl md:p-5">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-zinc-800/35 to-transparent md:rounded-2xl"></div>
                <div className="relative">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white md:mb-3 md:gap-2.5 md:text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] text-xs text-white md:h-9 md:w-9 md:rounded-lg md:text-sm">
                      📋
                    </span>
                    Detalii Tehnice
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Location Fields */}
                    {listing.county && (
                      <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                        <span className="text-gray-400 font-medium">Județ</span>
                        <span className="text-white font-bold">📍 {listing.county}</span>
                      </div>
                    )}
                    {listing.city && (
                      <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                        <span className="text-gray-400 font-medium">Oraș</span>
                        <span className="text-white font-bold">
                          🏙️{" "}
                          {seoCityHubHref ? (
                            <Link
                              href={seoCityHubHref}
                              className="transition-colors hover:text-cyan-200 hover:underline hover:underline-offset-4"
                            >
                              {listing.city}
                            </Link>
                          ) : (
                            listing.city
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Auto-specific fields */}
                    {isAutoListing && (
                      <>
                        {/* Basic Info */}
                        {listing.make && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Marcă</span>
                            <span className="text-white font-bold">🚗 {listing.make}</span>
                          </div>
                        )}
                        {listing.model && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Model</span>
                            <span className="text-white font-bold">{listing.model}</span>
                          </div>
                        )}
                        {(listing.attributes?.bodyType || listing.attributes?.body_type) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Caroserie</span>
                            <span className="text-white font-bold">🚙 {listing.attributes.bodyType || listing.attributes.body_type}</span>
                          </div>
                        )}
                        {listing.condition && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Stare</span>
                            <span className="text-white font-bold">
                              {(listing.condition === "new" || listing.condition === "Nou") && "✨ Nou"}
                              {(listing.condition === "used" || listing.condition === "Folosit") && "🔄 Folosit"}
                              {(listing.condition === "refurbished" || listing.condition === "Recondiționat") && "🔧 Recondiționat"}
                              {(listing.condition === "for_parts" || listing.condition === "Pentru piese") && "⚙️ Pentru piese"}
                              {!['new', 'used', 'refurbished', 'for_parts', 'Nou', 'Folosit', 'Recondiționat', 'Pentru piese'].includes(listing.condition) && listing.condition}
                            </span>
                          </div>
                        )}
                        
                        {/* Year & Registration */}
                        {listing.year && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">An fabricație</span>
                            <span className="text-white font-bold">📅 {listing.year}</span>
                          </div>
                        )}
                        {(listing.attributes?.firstRegistration || listing.attributes?.first_registration) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Prima înmatriculare</span>
                            <span className="text-white font-bold">📆 {listing.attributes.firstRegistration || listing.attributes.first_registration}</span>
                          </div>
                        )}
                        {listing.mileage && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Kilometraj</span>
                            <span className="text-white font-bold">🛣️ {listing.mileage.toLocaleString()} km</span>
                          </div>
                        )}
                        {listing.vin && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">VIN</span>
                            <span className="text-white font-bold font-mono text-sm">🔖 {listing.vin}</span>
                          </div>
                        )}
                        
                        {/* Engine & Performance */}
                        {listing.fuel && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Combustibil</span>
                            <span className="text-white font-bold">⛽ {listing.fuel}</span>
                          </div>
                        )}
                        {(listing.attributes?.horsePower || listing.attributes?.horse_power || listing.attributes?.hp) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Putere</span>
                            <span className="text-white font-bold">🐎 {listing.attributes.horsePower || listing.attributes.horse_power || listing.attributes.hp} CP</span>
                          </div>
                        )}
                        {(listing.attributes?.engineCapacity || listing.attributes?.engine_capacity || listing.attributes?.capacity) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Capacitate cilindrică</span>
                            <span className="text-white font-bold">🔧 {listing.attributes.engineCapacity || listing.attributes.engine_capacity || listing.attributes.capacity} cm³</span>
                          </div>
                        )}
                        {listing.transmission && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Transmisie</span>
                            <span className="text-white font-bold">⚙️ {listing.transmission}</span>
                          </div>
                        )}
                        {(listing.attributes?.drivetrain || listing.attributes?.drive_train) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Tracțiune</span>
                            <span className="text-white font-bold">🔄 {listing.attributes.drivetrain || listing.attributes.drive_train}</span>
                          </div>
                        )}
                        
                        {/* Exterior & Interior */}
                        {listing.attributes?.color && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Culoare</span>
                            <span className="text-white font-bold">🎨 {listing.attributes.color}</span>
                          </div>
                        )}
                        {(listing.attributes?.upholstery || listing.attributes?.interior) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Tapițerie</span>
                            <span className="text-white font-bold">🪑 {listing.attributes.upholstery || listing.attributes.interior}</span>
                          </div>
                        )}
                        {(listing.attributes?.doors || listing.attributes?.door_count) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Uși</span>
                            <span className="text-white font-bold">🚪 {listing.attributes.doors || listing.attributes.door_count}</span>
                          </div>
                        )}
                        {(listing.attributes?.seats || listing.attributes?.seat_count) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Locuri</span>
                            <span className="text-white font-bold">💺 {listing.attributes.seats || listing.attributes.seat_count}</span>
                          </div>
                        )}
                        
                        {/* History & Ownership */}
                        {(listing.attributes?.owners || listing.attributes?.owner_count || listing.attributes?.numberOfOwners) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Număr proprietari</span>
                            <span className="text-white font-bold">👥 {listing.attributes.owners || listing.attributes.owner_count || listing.attributes.numberOfOwners}</span>
                          </div>
                        )}
                        {(listing.attributes?.keys || listing.attributes?.key_count) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Chei</span>
                            <span className="text-white font-bold">🔑 {listing.attributes.keys || listing.attributes.key_count}</span>
                          </div>
                        )}
                        {(listing.attributes?.priorDamage !== undefined || listing.attributes?.prior_damage !== undefined || listing.attributes?.accident !== undefined) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Daune anterioare</span>
                            <span className="text-white font-bold">
                              {(listing.attributes.priorDamage === false || listing.attributes.prior_damage === false || listing.attributes.accident === false || listing.attributes.priorDamage === 'Nu' || listing.attributes.prior_damage === 'Nu') 
                                ? '✅ Nu' 
                                : (listing.attributes.priorDamage === true || listing.attributes.prior_damage === true || listing.attributes.accident === true || listing.attributes.priorDamage === 'Da' || listing.attributes.prior_damage === 'Da')
                                ? '⚠️ Da'
                                : listing.attributes.priorDamage || listing.attributes.prior_damage || listing.attributes.accident
                              }
                            </span>
                          </div>
                        )}
                        {(listing.attributes?.serviceHistory || listing.attributes?.service_history) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Istoric service</span>
                            <span className="text-white font-bold">📋 {listing.attributes.serviceHistory || listing.attributes.service_history}</span>
                          </div>
                        )}
                        
                        {/* Legal & Compliance */}
                        {(listing.attributes?.countryOfOrigin || listing.attributes?.country_of_origin) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Țara de origine</span>
                            <span className="text-white font-bold">🌍 {listing.attributes.countryOfOrigin || listing.attributes.country_of_origin}</span>
                          </div>
                        )}
                        {(listing.attributes?.lastRegistrationCountry || listing.attributes?.last_registration_country) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Ultima înmatriculare</span>
                            <span className="text-white font-bold">🌍 {listing.attributes.lastRegistrationCountry || listing.attributes.last_registration_country}</span>
                          </div>
                        )}
                        {(listing.attributes?.environmentalClass || listing.attributes?.environmental_class || listing.attributes?.emission_standard) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Normă poluare</span>
                            <span className="text-white font-bold">🌱 {listing.attributes.environmentalClass || listing.attributes.environmental_class || listing.attributes.emission_standard}</span>
                          </div>
                        )}
                        {(listing.attributes?.inspectionValid || listing.attributes?.inspection_valid || listing.attributes?.itp) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">ITP valabil până</span>
                            <span className="text-white font-bold">✅ {listing.attributes.inspectionValid || listing.attributes.inspection_valid || listing.attributes.itp}</span>
                          </div>
                        )}
                        {(listing.attributes?.warranty || listing.attributes?.garantie) && (
                          <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                            <span className="text-gray-400 font-medium">Garanție</span>
                            <span className="text-white font-bold">🛡️ {listing.attributes.warranty || listing.attributes.garantie}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Generic condition field for non-auto categories */}
                    {listing.category !== "Auto, moto și ambarcațiuni" && listing.condition && (
                      <div className="flex justify-between items-center py-2 px-3 bg-zinc-900/55 rounded-md border border-zinc-700/40">
                        <span className="text-gray-400 font-medium">Stare</span>
                        <span className="text-white font-bold">
                          {(listing.condition === "new" || listing.condition === "Nou") && "✨ Nou"}
                          {(listing.condition === "used" || listing.condition === "Folosit") && "🔄 Folosit"}
                          {(listing.condition === "refurbished" || listing.condition === "Recondiționat") && "🔧 Recondiționat"}
                          {(listing.condition === "for_parts" || listing.condition === "Pentru piese") && "⚙️ Pentru piese"}
                          {!['new', 'used', 'refurbished', 'for_parts', 'Nou', 'Folosit', 'Recondiționat', 'Pentru piese'].includes(listing.condition) && listing.condition}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="relative rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-3.5 shadow-sm backdrop-blur-sm md:rounded-2xl md:p-5">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-zinc-800/35 to-transparent md:rounded-2xl"></div>
                <div className="relative">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-white md:mb-3 md:gap-2.5 md:text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#00D4FF] to-[#00A8CC] text-xs text-white md:h-9 md:w-9 md:rounded-lg md:text-sm">
                      📝
                    </span>
                    Descriere
                  </h2>
                  <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed tracking-tight text-zinc-200/95 text-balance md:text-[0.9375rem]">
                    {listing.description || "Fără descriere."}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/40 bg-zinc-900/60 p-2.5 text-xs shadow-sm ring-1 ring-white/[0.03] backdrop-blur-sm sm:text-sm md:p-3.5">
                <span className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="text-lg">👁️</span>
                  <span className="text-white font-bold">{listing.views || 0}</span> vizualizări
                </span>
                <span className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  Publicat la <span className="text-white font-bold">{new Date(listing.createdAt).toLocaleDateString("ro-RO")}</span>
                </span>
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-3 md:space-y-4 lg:sticky lg:top-24 lg:self-start">
              {/* Seller Card */}
              <div className="relative rounded-xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-3 shadow-sm shadow-black/15 ring-1 ring-white/[0.03] backdrop-blur-sm transition-shadow duration-300 ease-out hover:shadow-sm hover:shadow-black/25 md:rounded-2xl md:p-4">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.025] to-transparent md:rounded-2xl" />
                <div className="relative">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white md:mb-3 md:text-base">
                    <span className="text-base md:text-lg">👤</span>
                    Vânzător
                  </h3>
                  <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-zinc-700/40 bg-zinc-900/70 p-2.5 md:mb-4 md:gap-3 md:p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] text-base font-bold text-white shadow-sm md:h-12 md:w-12 md:rounded-lg md:text-lg">
                      {sellerInitial || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white md:text-base">{sellerDisplayName}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-400 md:text-sm">
                        <span>✅</span>
                        {listing?.owner?.createdAt
                          ? `Membru din ${new Date(listing.owner.createdAt).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}`
                          : "Cont verificat pe platformă"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:space-y-2.5">
                    {isOwner && (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => router.push(`/listings/${id}/edit`)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-2 text-xs font-semibold text-white transition-all hover:scale-[1.01] hover:shadow-sm hover:shadow-blue-900/20 active:scale-[0.99] md:gap-2 md:py-2.5 md:text-sm"
                        >
                          <span>✏️</span>
                          <span>Editează</span>
                        </button>
                        <button
                          type="button"
                          title={
                            listingIsActiveForPromo
                              ? undefined
                              : "Anunțul este în așteptare. După aprobare/activare vei putea promova."
                          }
                          disabled={!listingIsActiveForPromo}
                          onClick={() => {
                            if (!listingIsActiveForPromo) return;
                            router.push(`/listings/${id}/promote`);
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 py-2 text-xs font-semibold text-white transition-all md:gap-2 md:py-2.5 md:text-sm ${
                            listingIsActiveForPromo
                              ? "hover:scale-[1.01] hover:shadow-sm hover:shadow-amber-900/20 active:scale-[0.99]"
                              : "cursor-not-allowed opacity-55"
                          }`}
                        >
                          <span>🚀</span>
                          <span>Promovează</span>
                        </button>
                      </div>
                    )}
                    
                    {!isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={openMessages}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6D5BFF] to-[#4E3CFF] py-2 text-xs font-semibold text-white shadow-sm shadow-black/20 transition-all duration-200 ease-out hover:shadow-sm hover:shadow-violet-900/30 active:scale-[0.99] md:py-2.5 md:text-sm"
                        >
                          <span>💬</span>
                          <span>Trimite mesaj</span>
                        </button>
                        {sellerPhone ? (
                          showPhone ? (
                            <a
                              href={`tel:${phoneTelHref}`}
                              onClick={() => id && void trackListingEngagement(id, "listing_phone_click")}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-zinc-900/80 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 md:py-2.5 md:text-sm"
                            >
                              <span>📞</span>
                              <span>{formatPhoneDisplay(sellerPhone)}</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (id) void trackListingEngagement(id, "listing_contact_click");
                                setShowPhone(true);
                              }}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-zinc-900/80 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/10 md:py-2.5 md:text-sm"
                            >
                              <span>📞</span>
                              <span>Afișează telefon</span>
                            </button>
                          )
                        ) : (
                          <p className="text-center text-gray-400 text-xs py-2 px-2 rounded-lg bg-zinc-900/50 border border-zinc-700/45">
                            Vânzătorul nu a afișat telefon — folosește mesajul.
                          </p>
                        )}
                      </>
                    )}

                    {isOwner && (
                      <p className="text-center text-gray-400 text-sm py-2">
                        Acesta este anunțul tău. Răspunde la mesaje din Dashboard.
                      </p>
                    )}
                  </div>

                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser?.id) {
                          router.push(`/auth/login?returnUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`);
                          return;
                        }
                        setShowReportModal(true);
                        setReportFeedback(null);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 md:mt-3 md:py-2.5 md:text-xs"
                    >
                      <span>⚠️</span>
                      <span>Raportează anunțul</span>
                    </button>
                  )}
                </div>
              </div>

              {isAutoListing && (
                <div className="rounded-lg border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-3 backdrop-blur-sm md:p-3.5">
                  <h4 className="mb-1 flex items-center gap-2 text-xs font-semibold text-indigo-200/95 md:mb-1.5 md:text-sm">
                    <span>🛡️</span>
                    <span>Verificare istoric auto</span>
                  </h4>
                  <p className="mb-2 text-xs leading-snug text-indigo-100/85 md:mb-3 md:text-sm">
                    Verifică rapid istoricul mașinii (daune, kilometraj, furt, status juridic) direct în platforma CarVertical.
                  </p>
                  <a
                    href={carHistoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white transition-shadow hover:shadow-sm hover:shadow-indigo-900/25 md:px-4 md:text-sm"
                  >
                    <span>🔎</span>
                    <span>Verifică pe CarVertical</span>
                  </a>
                  {listing.vin ? (
                    <p className="text-xs text-indigo-100/80 mt-3">
                      VIN detectat pentru precompletare: <span className="font-mono">{listing.vin}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-indigo-100/80 mt-3">
                      Nu există VIN în anunț. Utilizatorul poate continua verificarea manual pe pagina CarVertical.
                    </p>
                  )}
                </div>
              )}

              {isAutoListing && (
                <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black/90 border border-zinc-600/35 rounded-lg p-3.5 shadow-sm">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.06),transparent_55%)] pointer-events-none"></div>
                  <div className="relative">
                    <h4 className="font-semibold text-cyan-100/95 mb-1 flex items-center gap-2 text-sm">
                      <span>⚡</span>
                      <span>Verificări utile auto</span>
                    </h4>
                    <p className="text-xs text-cyan-50/85 mb-3 leading-snug">
                      Toolkit rapid pentru decizie: verificare oficială, cost estimat și comparație directă cu piața.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-2.5">
                        <p className="text-[11px] text-cyan-100/75">Cost combustibil / lună</p>
                        <p className="text-sm font-bold text-white tabular-nums">{monthlyFuelCost.toLocaleString("ro-RO")} RON</p>
                      </div>
                      <div className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-2.5">
                        <p className="text-[11px] text-indigo-100/75">Impozit estimat / an</p>
                        <p className="text-sm font-bold text-white tabular-nums">{yearlyTaxEstimate.toLocaleString("ro-RO")} RON</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <a
                        href={rarAutoPassUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-zinc-600/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors text-white text-sm font-semibold"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>🏛️</span>
                          <span>Verifică RAR AutoPass</span>
                        </span>
                        <span aria-hidden>↗</span>
                      </a>

                      <Link
                        href={similarAutoUrl}
                        className="w-full inline-flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-zinc-600/40 hover:bg-indigo-500/15 hover:border-indigo-400/30 transition-colors text-white text-sm font-semibold"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>📊</span>
                          <span>Compară cu anunțuri similare</span>
                        </span>
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Tips */}
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-600/25 rounded-lg p-3.5 backdrop-blur-sm">
                <h4 className="font-semibold text-yellow-200/95 mb-2 flex items-center gap-2 text-sm">
                  <span>⚠️</span>
                  <span>Sfaturi de siguranță</span>
                </h4>
                <ul className="text-xs text-yellow-100/95 space-y-1.5 font-medium leading-snug">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Nu plăti în avans</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Verifică produsul înainte</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Întâlnește-te în locuri publice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Verifică autenticitatea</span>
                  </li>
                </ul>
              </div>

              {/* Share Buttons */}
              <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 backdrop-blur-sm rounded-lg shadow-sm border border-zinc-700/40 p-4">
                <h4 className="font-semibold text-white mb-2.5 text-sm flex items-center gap-2">
                  <svg className="w-6 h-6 text-[#00D4FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Distribuie anunțul
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={shareOnFacebook}
                    className="flex-1 p-3 bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-500/30 rounded-lg hover:shadow-sm hover:shadow-blue-900/25 transition-shadow transform hover:scale-[1.01] active:scale-[0.99] group"
                    title="Facebook"
                  >
                    <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={shareOnWhatsApp}
                    className="flex-1 p-3 bg-gradient-to-br from-green-500 to-green-600 border border-green-400/30 rounded-lg hover:shadow-sm hover:shadow-emerald-900/25 transition-shadow transform hover:scale-[1.01] active:scale-[0.99] group"
                    title="WhatsApp"
                  >
                    <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={copyLink}
                    className="relative flex-1 p-3 bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600/40 rounded-lg hover:shadow-sm hover:shadow-black/30 transition-shadow transform hover:scale-[1.01] active:scale-[0.99] group"
                    title="Copiază link"
                  >
                    {showCopySuccess ? (
                      <svg className="w-6 h-6 mx-auto text-green-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                    {showCopySuccess && (
                      <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap font-bold shadow-lg">
                        ✓ Copiat!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Similar Listings */}
          <div className="mt-8">
            <h2 className="mb-3 text-base font-semibold tracking-tight text-zinc-100">Anunțuri similare</h2>
            {similarLoading ? (
              <div className="text-sm text-gray-500">Se încarcă anunțurile similare…</div>
            ) : similarListings.length === 0 ? (
              <div
                className="rounded-xl border border-gray-700/35 bg-gray-900/35 px-5 py-8 text-center text-sm text-gray-400"
                role="status"
              >
                <p className="font-medium text-gray-300">Niciun anunț similar momentan</p>
                <p className="mt-1.5 text-gray-500">
                  Nu există alte anunțuri încărcate din aceeași categorie/filtru. Revino mai târziu sau explorează categoria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {similarListings.map((item) => {
                  const similarPhotos = normalizeListingPhotosArray(item?.photos);
                  const similarSrc =
                    similarPhotos.length > 0
                      ? normalizeListingPhotoUrl(similarPhotos[0]) || DEFAULT_LISTING_IMAGE_URL
                      : DEFAULT_LISTING_IMAGE_URL;
                  return (
                    <Link
                      key={item.id}
                      href={`/listings/${item.id}`}
                      className="group block cursor-pointer overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-zinc-900/[0.06] transition-shadow duration-200 ease-out hover:shadow-md hover:ring-zinc-900/[0.1]"
                    >
                      <div className="aspect-video bg-gray-200 overflow-hidden">
                        <img
                          src={similarSrc}
                          alt={item.title || "Anunț similar"}
                          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.onerror = null;
                            el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="text-[13px] font-medium leading-snug text-zinc-900 mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {item.title || "Anunț similar"}
                        </h3>
                        <p className="text-base font-semibold tabular-nums text-zinc-900">
                          {typeof item.priceAmount === "number" ? item.priceAmount.toLocaleString() : "—"} {item.priceCurrency || "RON"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1.5">
                          📍 {item.city || item.county || "România"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {showReportModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !reportLoading && setShowReportModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700/80 rounded-2xl max-w-md w-full p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Raportează anunțul</h3>
            <label className="block text-sm text-gray-400 mb-2">Motiv</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
            >
              <option value="spam">Spam / înșelător</option>
              <option value="fraud">Fraudă</option>
              <option value="illegal">Conținut ilegal</option>
              <option value="copyright">Drepturi de autor</option>
              <option value="inappropriate">Conținut nepotrivit</option>
              <option value="other">Altele</option>
            </select>
            <label className="block text-sm text-gray-400 mb-2">Detalii (min. 10 caractere)</label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={4}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white resize-none"
              placeholder="Descrie problema..."
            />
            {reportFeedback && (
              <p className={`text-sm mb-3 ${reportFeedback.includes("Mulțumim") || reportFeedback.includes("trimis") ? "text-green-400" : "text-red-400"}`}>
                {reportFeedback}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={reportLoading}
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={reportLoading || reportDescription.trim().length < 10}
                onClick={submitReport}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50"
              >
                {reportLoading ? "Se trimite…" : "Trimite raportul"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
