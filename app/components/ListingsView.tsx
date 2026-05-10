"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  CAR_MAKES_AND_MODELS, 
  POPULAR_MAKES, 
  ALL_CATEGORIES, 
  CATEGORIES,
  ROMANIAN_COUNTIES, 
  CITIES_BY_COUNTY 
} from "@/lib/carData";
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from "@/lib/listing-photo-url";
import type { ListingPublicDto } from "@clickanunt/api-contracts";

type Listing = ListingPublicDto;

export interface ListingsViewProps {
  /** Example: `/auto/bucuresti` — pagination & filters sync to this path segments. */
  routeBase?: string;
  initialCategory?: string;
  initialCity?: string;
  initialCounty?: string;
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

    if (!hasListingQuery && routeBase && (initialCategory || initialCity || initialCounty)) {
      setFilters((prev) => ({
        ...prev,
        ...(initialCategory ? { category: initialCategory } : {}),
        ...(initialCounty ? { county: initialCounty } : {}),
        ...(initialCity ? { city: initialCity } : {}),
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
  }, [searchParams, routeBase, initialCategory, initialCity, initialCounty]);

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
      
      if (!res.ok) {
        throw new Error(`Failed to load listings: ${res.status}`);
      }
      
      const data = await res.json();
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

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
      <h1 className="text-4xl font-bold tracking-tight text-white mb-4">{pageTitle ?? "Toate anunțurile"}</h1>
      {seoIntro ? <div className="mb-8 text-sm leading-relaxed text-gray-400 max-w-3xl space-y-3">{seoIntro}</div> : null}

      {/* Filters */}
      {isFiltersOpen ? (
        <div className={`relative overflow-hidden bg-[#161B22] p-6 md:p-8 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] mb-10 border border-white/5 transition-all duration-normal ease-premium ${
          isFilterSticky ? 'lg:sticky lg:top-4 lg:z-40' : ''
        }`}>
          
          {/* Content */}
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-7 h-7 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtre
              </h2>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1C212B] text-white/80 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200 text-sm font-semibold"
              >
                Ascunde filtre
              </button>
            </div>

            {/* Main filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Category */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
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
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
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
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                Subcategorie
              </label>
              <select
                value={filters.subcategory || ''}
                onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                disabled={!filters.category}
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
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
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
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
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
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

          <div className="border-t border-white/5 my-6" />

          {/* Second row of filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* City */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                Oraș
              </label>
              <select
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
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
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                Preț min (RON)
              </label>
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="5000"
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
              />
            </div>

            {/* Price Max */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                Preț max (RON)
              </label>
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="50000"
                className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
              />
            </div>
          </div>

          {/* Auto-specific filters (shown only for Auto category) */}
          {isAutoCategory && (
            <div className="relative bg-[#1C212B] p-6 rounded-2xl border border-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] mb-8">
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Filtre Auto
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Make */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
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
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
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
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                      Model
                    </label>
                    <select
                      value={filters.model || ''}
                      onChange={(e) => handleFilterChange('model', e.target.value)}
                      disabled={!filters.make}
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200 disabled:bg-[#0F1117] disabled:text-white/40 disabled:cursor-not-allowed"
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
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                      Combustibil
                    </label>
                    <select
                      value={filters.fuel || ''}
                      onChange={(e) => handleFilterChange('fuel', e.target.value)}
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                    >
                      <option value="">Orice combustibil</option>
                      <option value="Benzină">Benzină</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hibrid">Hibrid</option>
                      <option value="Electric">Electric</option>
                      <option value="GPL">GPL</option>
                      <option value="Benzină+GPL">Benzină+GPL</option>
                      <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Transmission */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                      Transmisie
                    </label>
                    <select
                      value={filters.transmission || ''}
                      onChange={(e) => handleFilterChange('transmission', e.target.value)}
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                    >
                      <option value="">Orice transmisie</option>
                      <option value="Manuală">Manuală</option>
                      <option value="Automată">Automată</option>
                      <option value="Semi-automată">Semi-automată</option>
                    </select>
                  </div>

                  {/* Year Min */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                      An min
                    </label>
                    <input
                      type="number"
                      value={filters.yearMin || ''}
                      onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2010"
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                    />
                  </div>

                  {/* Year Max */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                      An max
                    </label>
                    <input
                      type="number"
                      value={filters.yearMax || ''}
                      onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2024"
                      className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Non-auto year filters */}
          {!isAutoCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                  An min
                </label>
                <input
                  type="number"
                  value={filters.yearMin || ''}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2010"
                  className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                />
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-gray-100">
                  An max
                </label>
                <input
                  type="number"
                  value={filters.yearMax || ''}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2024"
                  className="w-full px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
                />
              </div>
            </div>
          )}

          <div className="border-t border-white/5 my-6" />

          {/* Sorting */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Sortare
            </label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="w-full md:w-80 px-4 py-3 rounded-[12px] bg-[#1C212B] border border-white/5 text-white placeholder:text-white/40 focus:border-white/10 focus:ring-2 focus:ring-[rgba(99,102,241,0.35)] transition-all duration-200"
            >
              <option value="createdAt-desc">Cele mai noi</option>
              <option value="createdAt-asc">Cele mai vechi</option>
              <option value="price-asc">Preț crescător</option>
              <option value="price-desc">Preț descrescător</option>
              <option value="year-desc">An fabricație descrescător</option>
              <option value="year-asc">An fabricație crescător</option>
            </select>
          </div>

            <div className="flex flex-wrap gap-3">
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
                className="h-11 px-6 rounded-[12px] bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] hover:from-[#5B4BFF] hover:to-[#4338CA] text-white font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
              >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Aplică filtre
            </button>
              <button
                onClick={clearFilters}
                className="h-11 px-6 rounded-[12px] bg-[#1C212B] text-white/80 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
              >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Resetează filtre
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/5 bg-[#161B22] px-5 py-4">
          <div className="text-white/80 text-sm font-semibold">Filtre ascunse</div>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#1C212B] text-white/80 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200 text-sm font-semibold"
          >
            Afișează filtre
          </button>
        </div>
      )}

      {showFiltersApplied && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-semibold">
          Filtre aplicate cu succes.
        </div>
      )}

      {/* Active Filter Chips */}
      {Object.entries(filters).some(([key, value]) => value && key !== 'sortBy' && key !== 'sortOrder') && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-400">Filtre active:</span>
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
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1C212B] border border-white/10 text-white/80 text-sm font-medium rounded-full transition-all duration-200 group hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
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
            className="text-sm font-medium text-gray-400 hover:text-white underline transition-colors"
            aria-label="Clear all filters"
          >
            Șterge toate
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#1A1D24] border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Loading - Skeleton Cards */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-[#1A1D24] to-[#161B22] rounded-xl border border-white/5 overflow-hidden animate-pulse"
              role="status"
              aria-label="Se încarcă anunț"
            >
              {/* Image skeleton */}
              <div className="aspect-video bg-gradient-to-br from-[#111827] to-[#0F1117]"></div>
              {/* Content skeleton */}
              <div className="p-4">
                <div className="h-6 bg-[#111827] rounded mb-3 w-3/4"></div>
                <div className="h-5 bg-[#111827] rounded mb-3 w-2/3"></div>
                <div className="h-7 bg-[#111827] rounded mb-3 w-1/2"></div>
                <div className="h-4 bg-[#111827] rounded mb-4 w-full"></div>
                <div className="h-10 bg-[#111827] rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          <div id="listings-results" className="mb-6 text-gray-400 text-base font-medium">
            Găsite <span className="text-white font-bold">{total}</span> anunțuri{listings.length > 0 && ` (pagina ${page} din ${totalPages})`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
            {listings.map((listing, index) => (
              <article
                key={listing.id}
                className="group relative bg-gradient-to-br from-[#1A1D24] to-[#161B22] rounded-xl border border-white/8 overflow-hidden shadow-lg hover:shadow-2xl hover:border-white/15 hover:-translate-y-1 transition-all duration-normal ease-premium flex flex-col h-full"
                aria-label={listing.title}
              >
                {/* Image - Fixed 16:9 Aspect Ratio */}
                <div className="relative aspect-video bg-gradient-to-br from-[#111827] to-[#0F1117] overflow-hidden">
                  <img
                    src={listingPrimaryPhotoSrc(listing.photos)}
                    alt={listing.title}
                    loading={index < 3 ? "eager" : "lazy"}
                    width={640}
                    height={360}
                    className="w-full h-full object-cover transition-transform duration-normal ease-premium group-hover:scale-110"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.onerror = null;
                      el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Title - Consistent height */}
                  <h3 className="text-base font-bold text-white mb-3 line-clamp-2 min-h-[2.8rem] leading-snug text-justify">
                    {listing.title}
                  </h3>
                  
                  {/* Metadata - Consistent height */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-3 min-h-[1.5rem]">
                    {listing.make && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium">
                        {listing.make}
                      </span>
                    )}
                    {listing.year && (
                      <span className="px-2 py-1 bg-gray-700/40 text-gray-300 rounded-full font-medium">
                        {listing.year}
                      </span>
                    )}
                    {listing.mileage && (
                      <span className="px-2 py-1 bg-gray-700/40 text-gray-300 rounded-full text-xs font-medium">
                        {new Intl.NumberFormat('ro-RO').format(listing.mileage)} km
                      </span>
                    )}
                  </div>

                  {/* Price - Prominent */}
                  <div className="text-2xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                    {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: listing.priceCurrency, maximumFractionDigits: 0 }).format(listing.priceAmount)}
                  </div>

                  {/* Description - Consistent height */}
                  {listing.description && (
                    <p className="text-xs text-gray-400 mb-4 line-clamp-2 min-h-[2rem] leading-relaxed">
                      {listing.description}
                    </p>
                  )}

                  {/* Button - Always at bottom */}
                  <Link
                    href={`/listings/${listing.id}`}
                    className="mt-auto block text-center h-10 px-4 rounded-lg bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#5B4BFF] hover:to-[#00C4E0] text-white font-bold text-sm transition-all duration-normal ease-premium shadow-lg hover:shadow-xl hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]/50 flex items-center justify-center"
                    aria-label={`View details for ${listing.title}`}
                  >
                    Vezi detalii
                  </Link>
                </div>
              </article>
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
                className="px-5 py-2.5 bg-gradient-to-r from-[#1C212B] to-[#161B22] border border-white/10 hover:border-white/20 rounded-lg text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]/50"
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
                      className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]/50 ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gradient-to-br from-[#1C212B] to-[#161B22] border border-white/5 text-white/70 hover:border-white/15 hover:text-white hover:shadow-md'
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
                className="px-5 py-2.5 bg-gradient-to-r from-[#1C212B] to-[#161B22] border border-white/10 hover:border-white/20 rounded-lg text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5BFF]/50"
              >
                Înainte
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {listings.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xl font-bold mb-2">Nu s-au găsit anunțuri</p>
              <p className="text-sm">Încearcă să modifici filtrele sau să cauți cu alți parametri</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
