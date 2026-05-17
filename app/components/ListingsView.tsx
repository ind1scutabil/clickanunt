"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  CAR_MAKES_AND_MODELS, 
  POPULAR_MAKES, 
  ALL_CATEGORIES, 
  CATEGORIES,
  ROMANIAN_COUNTIES, 
  CITIES_BY_COUNTY 
} from "@/lib/carData";
import { ListingCard } from "@/app/components/ListingCard";
import type { ListingPublicDto } from "@clickanunt/api-contracts";

type Listing = ListingPublicDto;

function mapPublicListingToCardProps(l: Listing) {
  const owner = l.owner;
  const o =
    owner && typeof owner === "object" && "id" in owner
      ? (owner as Listing["owner"])
      : undefined;
  return {
    id: l.id,
    title: l.title,
    priceAmount: l.priceAmount,
    priceCurrency: l.priceCurrency,
    category: l.category,
    photos: l.photos,
    createdAt: l.createdAt,
    status: l.status,
    isPromoted: l.isPromoted,
    views: l.views,
    city: l.city,
    county: l.county,
    owner: o
      ? {
          id: o.id,
          businessName:
            "businessName" in o && typeof o.businessName === "string" ? o.businessName : undefined,
          trustScore: typeof o.trustScore === "number" ? o.trustScore : 0,
          verificationLevel:
            "emailVerified" in o && o.emailVerified
              ? ("email" as const)
              : "phoneVerified" in o && o.phoneVerified
                ? ("phone" as const)
                : ("none" as const),
        }
      : undefined,
  };
}

export interface ListingsViewProps {
  /** Example: `/auto/bucuresti` — pagination & filters sync to this path segments. */
  routeBase?: string;
  initialCategory?: string;
  initialCity?: string;
  initialCounty?: string;
  initialMake?: string;
  initialModel?: string;
  pageTitle?: string;
  seoIntro?: ReactNode;
}

interface Filters {
  q?: string;
  category?: string;
  subcategory?: string;
  make?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
  county?: string;
  city?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
  sortOrder?: string;
}

export default function ListingsView({
  routeBase,
  initialCategory,
  initialCity,
  initialCounty,
  initialMake,
  initialModel,
  pageTitle,
  seoIntro,
}: ListingsViewProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasActiveSearch = Boolean(
    searchParams.get('q') ||
      searchParams.get('search') ||
      searchParams.get('category') ||
      searchParams.get('subcategory') ||
      searchParams.get('county') ||
      searchParams.get('city')
  );
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(!hasActiveSearch);
  const [showFiltersApplied, setShowFiltersApplied] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const activeRequestRef = useRef(0);

  const limit = 12;

  const pushBrowsePath = useCallback(
    (nextFilters: Filters, nextPage: number) => {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && k !== "sortBy" && k !== "sortOrder") {
          params.set(k, String(v));
        }
      });
      if (nextPage > 1) {
        params.set("page", String(nextPage));
      }
      const path = routeBase ?? "/listings";
      router.push(`${path}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    },
    [routeBase, router]
  );

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    return filters.category ? CATEGORIES[filters.category] || [] : [];
  }, [filters.category]);

  // Get available models for selected make
  const availableModels = useMemo(() => {
    return filters.make ? CAR_MAKES_AND_MODELS[filters.make] || [] : [];
  }, [filters.make]);

  // Get available cities for selected county
  const availableCities = useMemo(() => {
    return filters.county ? CITIES_BY_COUNTY[filters.county] || [] : [];
  }, [filters.county]);

  const isAutoCategory = filters.category === "Auto, moto și ambarcațiuni";

  // Read URL params + optional SEO hub defaults
  useEffect(() => {
    const searchQuery = searchParams.get("q") || searchParams.get("search");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const county = searchParams.get("county");
    const city = searchParams.get("city");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);

    const hasListingQuery =
      Boolean(searchQuery) || Boolean(category) || Boolean(subcategory) || Boolean(county) || Boolean(city);

    if (
      !hasListingQuery &&
      routeBase &&
      (initialCategory || initialCity || initialCounty || initialMake || initialModel)
    ) {
      setFilters((prev) => ({
        ...prev,
        ...(initialCategory ? { category: initialCategory } : {}),
        ...(initialCounty ? { county: initialCounty } : {}),
        ...(initialCity ? { city: initialCity } : {}),
        ...(initialMake ? { make: initialMake } : {}),
        ...(initialModel ? { model: initialModel } : {}),
      }));
      setIsFiltersOpen(false);
    } else if (hasListingQuery) {
      setFilters((prev) => ({
        ...prev,
        ...(searchQuery && { q: searchQuery }),
        ...(category && { category }),
        ...(subcategory && { subcategory }),
        ...(county && { county }),
        ...(city && { city }),
      }));
      setIsFiltersOpen(false);
    }

    if (!Number.isNaN(pageParam) && pageParam > 0) {
      setPage(pageParam);
    }
  }, [searchParams, routeBase, initialCategory, initialCity, initialCounty, initialMake, initialModel]);

  useEffect(() => {
    loadListings();
  }, [page, filters]);

  // Scroll detection for sticky filters on mobile
  useEffect(() => {
    const handleScroll = () => {
      setIsFilterSticky(window.scrollY > 200);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadListings() {
    const requestId = ++activeRequestRef.current;
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '') return;
        if (key === 'sortBy' || key === 'sortOrder') return;
        params.set(key, value.toString());
      });

      const sortKey = `${filters.sortBy}-${filters.sortOrder}`;
      const sortMap: Record<string, string> = {
        'createdAt-desc': 'newest',
        'price-asc': 'priceAsc',
        'price-desc': 'priceDesc',
        'featured-desc': 'featured',
      };
      const sort = sortMap[sortKey];
      if (sort) {
        params.set('sort', sort);
      }

      const res = await fetch(`/api/listings?${params}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as {
        data?: Listing[];
        listings?: Listing[];
        pagination?: { total?: number; count?: number };
        error?: string;
      };

      if (!res.ok) {
        const msg =
          typeof data.error === "string" && data.error.length > 0
            ? data.error
            : `Eroare la încărcare (${res.status}).`;
        throw new Error(msg);
      }
      if (requestId !== activeRequestRef.current) {
        // Ignore stale responses (prevents category mismatch/race flicker).
        return;
      }
      // API returns { data: [...], pagination: {...} }
      setListings(data.data || data.listings || []);
      setTotal(data.pagination?.total || data.pagination?.count || data.data?.length || 0);
    } catch (err: any) {
      if (requestId !== activeRequestRef.current) return;
      setError(err.message || 'Eroare la încărcarea anunțurilor');
    } finally {
      if (requestId !== activeRequestRef.current) return;
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof Filters, value: any) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);

    if (routeBase) {
      pushBrowsePath(newFilters, 1);
    } else {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v && k !== "sortBy" && k !== "sortOrder") {
          params.set(k, v.toString());
        }
      });

      router.push(`/listings${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
    }
  }

  function clearFilters() {
    setFilters({
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setPage(1);
    router.push(routeBase ? `${routeBase}` : "/listings", { scroll: false });
  }

  const totalPages = Math.ceil(total / limit);

  const hubHero = Boolean(seoIntro || routeBase);

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-3 pb-[max(2rem,calc(6rem+env(safe-area-inset-bottom,0px)))] pt-5 text-zinc-200 sm:px-5 sm:pb-10 sm:pt-6 md:pb-10 lg:px-8">
      {hubHero ? (
        <header className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#181b22] px-5 py-5 shadow-sm ring-1 ring-white/[0.04] sm:mb-7 sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_300px_at_0%_0%,rgba(30,58,138,0.07),transparent_55%)]"
            aria-hidden
          />
          <div className="relative">
            <h1 className="text-display max-w-4xl text-balance text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl md:text-4xl">
              {pageTitle ?? "Toate anunțurile"}
            </h1>
            {seoIntro ? (
              <div className="mt-3 max-w-3xl space-y-3 text-[13px] leading-relaxed text-zinc-400 md:text-sm">
                {seoIntro}
              </div>
            ) : null}
          </div>
        </header>
      ) : (
        <>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:mb-4 sm:text-3xl md:text-4xl">
            {pageTitle ?? "Toate anunțurile"}
          </h1>
          {seoIntro ? (
            <div className="mb-8 max-w-3xl space-y-3 text-[13px] leading-relaxed text-zinc-400 md:text-sm">{seoIntro}</div>
          ) : null}
        </>
      )}

      {/* Filters */}
      {isFiltersOpen ? (
        <div
          className={`listings-filters-panel relative mb-5 max-w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 via-zinc-950/90 to-[#08090d] p-3.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.05] backdrop-blur-md transition-colors [color-scheme:dark] sm:mb-7 sm:p-5 ${
            isFilterSticky ? "lg:sticky lg:top-4 lg:z-40" : ""
          }`}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"
            aria-hidden
          />
          {/* Content */}
          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-100 sm:gap-2 sm:text-lg">
                <svg className="h-5 w-5 shrink-0 text-zinc-500 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtre
              </h2>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="rounded-md border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-white/[0.14] hover:bg-white/[0.08] sm:px-4 sm:py-2 sm:text-sm"
              >
                Ascunde filtre
              </button>
            </div>

            {/* Main filters */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-6 md:grid-cols-3">
            {/* Category */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors sm:mb-2 sm:text-sm group-hover:text-zinc-400">
                Categorie
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => {
                  const category = e.target.value;
                  if (category) {
                    router.push(`/listings?category=${encodeURIComponent(category)}`);
                  } else {
                    router.push("/listings");
                  }
                }}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1d24] px-3 py-2.5 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:px-4 sm:py-3"
              >
                <option value="">Toate categoriile</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                Subcategorie
              </label>
              <select
                value={filters.subcategory || ''}
                onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                disabled={!filters.category}
                className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
              >
                <option value="">Toate subcategoriile</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* County */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                Județ
              </label>
              <select
                value={filters.county || ''}
                onChange={(e) => {
                  setFilters(prev => ({ 
                    ...prev, 
                    county: e.target.value,
                    city: '', // Reset city when county changes
                  }));
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
              >
                <option value="">Toate județele</option>
                {ROMANIAN_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="my-4 border-t border-white/[0.06] sm:my-6" />

          {/* Second row of filters */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-6 md:grid-cols-3">
            {/* City */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                Oraș
              </label>
              <select
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
              >
                <option value="">Toate orașele</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Min */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                Preț min (RON)
              </label>
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="5000"
                className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
              />
            </div>

            {/* Price Max */}
            <div className="group">
              <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                Preț max (RON)
              </label>
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="50000"
                className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
              />
            </div>
          </div>

          {/* Auto-specific filters (shown only for Auto category) */}
          {isAutoCategory && (
            <div className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#161922] p-4 shadow-sm ring-1 ring-white/[0.04] sm:mb-8 sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_0%_0%,rgba(30,58,138,0.06),transparent_50%)]"
                aria-hidden
              />
              <div className="relative">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-100 sm:mb-5 sm:text-lg">
                  <svg className="h-5 w-5 shrink-0 text-sky-500/80 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Filtre Auto
                </h3>
            
                <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:gap-6 md:grid-cols-3">
                  {/* Make */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      Marcă
                    </label>
                    <select
                      value={filters.make || ''}
                      onChange={(e) => {
                        setFilters(prev => ({ 
                          ...prev, 
                          make: e.target.value,
                          model: '', // Reset model when make changes
                        }));
                        setPage(1);
                      }}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                    >
                      <option value="">Toate mărcile</option>
                      {POPULAR_MAKES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      Model
                    </label>
                    <select
                      value={filters.model || ''}
                      onChange={(e) => handleFilterChange('model', e.target.value)}
                      disabled={!filters.make}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
                    >
                      <option value="">Toate modelele</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fuel */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      Combustibil
                    </label>
                    <select
                      value={filters.fuel || ''}
                      onChange={(e) => handleFilterChange('fuel', e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                    >
                      <option value="">Orice combustibil</option>
                      <option value="petrol">Benzină</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hibrid</option>
                      <option value="electric">Electric</option>
                      <option value="other">GPL / altele</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-3">
                  {/* Transmission */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      Transmisie
                    </label>
                    <select
                      value={filters.transmission || ''}
                      onChange={(e) => handleFilterChange('transmission', e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                    >
                      <option value="">Orice transmisie</option>
                      <option value="manual">Manuală</option>
                      <option value="automatic">Automată</option>
                      <option value="semiautomatic">Semi-automată</option>
                    </select>
                  </div>

                  {/* Year Min */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      An min
                    </label>
                    <input
                      type="number"
                      value={filters.yearMin || ''}
                      onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2010"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                    />
                  </div>

                  {/* Year Max */}
                  <div className="group">
                    <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-300 sm:mb-2 sm:text-sm">
                      An max
                    </label>
                    <input
                      type="number"
                      value={filters.yearMax || ''}
                      onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2024"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Non-auto year filters */}
          {!isAutoCategory && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-6 md:grid-cols-2">
              <div className="group">
                <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                  An min
                </label>
                <input
                  type="number"
                  value={filters.yearMin || ''}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2010"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                />
              </div>
              <div className="group">
                <label className="mb-1 block text-xs font-semibold text-zinc-500 transition-colors group-hover:text-zinc-400 sm:mb-2 sm:text-sm">
                  An max
                </label>
                <input
                  type="number"
                  value={filters.yearMax || ''}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2024"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:rounded-lg sm:px-4 sm:py-3"
                />
              </div>
            </div>
          )}

          <div className="my-4 border-t border-white/[0.06] sm:my-6" />

          {/* Sorting */}
          <div className="mb-4 sm:mb-6">
            <label className="mb-1 block text-xs font-semibold text-zinc-500 sm:mb-2 sm:text-sm">
              Sortare
            </label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1a1d24] px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors placeholder:text-zinc-500 focus:border-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:px-4 sm:py-3 md:w-80"
            >
              <option value="createdAt-desc">Cele mai noi</option>
              <option value="createdAt-asc">Cele mai vechi</option>
              <option value="price-asc">Preț crescător</option>
              <option value="price-desc">Preț descrescător</option>
              <option value="year-desc">An fabricație descrescător</option>
              <option value="year-asc">An fabricație crescător</option>
            </select>
          </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={async () => {
                  await loadListings();
                  setIsFiltersOpen(false);
                  setShowFiltersApplied(true);
                  setTimeout(() => setShowFiltersApplied(false), 2500);
                  const resultsEl = document.getElementById('listings-results');
                  if (resultsEl) {
                    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 sm:h-11 sm:gap-2 sm:px-6"
              >
              <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Aplică filtre
            </button>
              <button
                onClick={clearFilters}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 text-sm font-semibold text-zinc-200 shadow-sm transition-colors hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 sm:h-11 sm:gap-2 sm:px-6"
              >
              <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Resetează filtre
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#181b22] px-3 py-2.5 shadow-sm sm:mb-5 sm:px-5 sm:py-4">
          <div className="text-sm font-semibold text-zinc-400">Filtre ascunse</div>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            className="rounded-md border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.14] hover:bg-white/[0.08]"
          >
            Afișează filtre
          </button>
        </div>
      )}

      {showFiltersApplied && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/35 px-4 py-3 text-sm font-medium text-emerald-100">
          Filtre aplicate cu succes.
        </div>
      )}

      {/* Active Filter Chips */}
      {Object.entries(filters).some(([key, value]) => value && key !== 'sortBy' && key !== 'sortOrder') && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-500">Filtre active:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (!value || key === 'sortBy' || key === 'sortOrder') return null;
            
            const filterLabels: Record<string, string> = {
              category: 'Categorie',
              subcategory: 'Subcategorie',
              make: 'Marcă',
              model: 'Model',
              fuel: 'Combustibil',
              transmission: 'Transmisie',
              county: 'Județ',
              city: 'Oraș',
              yearMin: 'An min',
              yearMax: 'An max',
              priceMin: 'Preț min',
              priceMax: 'Preț max',
            };
            
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key as keyof Filters, undefined)}
                className="group inline-flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-1.5 text-sm font-medium text-zinc-100 shadow-sm transition hover:border-orange-500/30 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
                aria-label={`Remove ${filterLabels[key]} filter`}
              >
                <span>{filterLabels[key]}: {value}</span>
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            );
          })}
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-zinc-500 underline transition-colors hover:text-zinc-300"
            aria-label="Clear all filters"
          >
            Șterge toate
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm font-medium text-red-200">
          {error}
        </div>
      )}

      {/* Loading - Skeleton Cards */}
      {loading && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-3.5 md:mb-10 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12151c]"
              role="status"
              aria-label="Se încarcă anunț"
            >
              <div className="aspect-[5/3] bg-zinc-800/70" />
              <div className="space-y-2 p-2.5 sm:p-3 md:p-3.5">
                <div className="h-4 w-[88%] rounded-full bg-zinc-800/80" />
                <div className="h-3 w-[42%] rounded-full bg-zinc-800/55" />
                <div className="h-5 w-[52%] rounded-full bg-zinc-800/70 pt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          <div id="listings-results" className="mb-6 text-sm font-medium text-zinc-500">
            Găsite <span className="font-bold tabular-nums text-zinc-100">{total}</span> anunțuri{listings.length > 0 && ` (pagina ${page} din ${totalPages})`}
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-3.5 md:mb-10 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={mapPublicListingToCardProps(listing)}
                showFavorite
                appearance="ink"
                imagePriority={index < 4}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 py-8">
              <button
                onClick={() => {
                  const np = Math.max(1, page - 1);
                  setPage(np);
                  if (routeBase) pushBrowsePath(filters, np);
                }}
                disabled={page === 1}
                className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#1a1d24] px-5 py-2.5 font-semibold text-zinc-100 transition-colors hover:border-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Înapoi
              </button>
              
              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setPage(pageNum);
                        if (routeBase) pushBrowsePath(filters, pageNum);
                      }}
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 ${
                        page === pageNum
                          ? "bg-orange-600 text-white shadow-sm"
                          : "border border-white/[0.1] bg-[#1a1d24] text-zinc-300 hover:border-white/[0.14] hover:text-zinc-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const np = Math.min(totalPages, page + 1);
                  setPage(np);
                  if (routeBase) pushBrowsePath(filters, np);
                }}
                disabled={page === totalPages}
                className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#1a1d24] px-5 py-2.5 font-semibold text-zinc-100 transition-colors hover:border-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25"
              >
                Înainte
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {listings.length === 0 && !loading && (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] px-8 py-14 text-center shadow-[0_28px_80px_-28px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.05] sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700/70 bg-zinc-900/80 shadow-inner">
                <svg className="h-8 w-8 text-orange-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="mb-2 text-lg font-semibold tracking-tight text-zinc-50">Nu s-au găsit anunțuri pentru filtrele curente</p>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500">
                Ajustează criteriile sau revino la categoriile principale.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
