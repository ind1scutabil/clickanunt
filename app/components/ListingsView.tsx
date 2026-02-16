"use client";
import React, { useState, useEffect, useMemo } from "react";
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

interface Listing {
  id: string;
  title: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  priceAmount: number;
  priceCurrency: string;
  description?: string;
  photos?: string[];
  status: string;
  createdAt: string;
  category?: string;
  subcategory?: string;
  fuel?: string;
  transmission?: string;
  county?: string;
  city?: string;
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

export default function ListingsView() {
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

  const limit = 12;

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

  // Read URL params on mount
  useEffect(() => {
    const searchQuery = searchParams.get('q') || searchParams.get('search');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const county = searchParams.get('county');
    const city = searchParams.get('city');
    
    if (searchQuery || category || subcategory || county || city) {
      setFilters(prev => ({
        ...prev,
        ...(searchQuery && { q: searchQuery }),
        ...(category && { category }),
        ...(subcategory && { subcategory }),
        ...(county && { county }),
        ...(city && { city }),
      }));
      setIsFiltersOpen(false);
    }
  }, [searchParams]);

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

      const res = await fetch(`/api/listings?${params}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load listings: ${res.status}`);
      }
      
      const data = await res.json();
      // API returns { data: [...], pagination: {...} }
      setListings(data.data || data.listings || []);
      setTotal(data.pagination?.total || data.pagination?.count || data.data?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea anunțurilor');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof Filters, value: any) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    
    // Update URL with all active filters
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && k !== 'sortBy' && k !== 'sortOrder') {
        params.set(k, v.toString());
      }
    });
    
    router.push(`/listings${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  }

  function clearFilters() {
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setPage(1);
    router.push('/listings', { scroll: false });
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
      <h1 className="text-4xl font-bold tracking-tight text-white mb-8">Toate anunțurile</h1>

      {/* Filters */}
      {isFiltersOpen ? (
        <div className={`relative overflow-hidden bg-[#161B22] p-6 md:p-8 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] mb-10 border border-white/5 transition-all duration-300 ${
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
                    router.push('/listings');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1A1D24] rounded-2xl border border-white/5 overflow-hidden animate-pulse"
              role="status"
              aria-label="Se încarcă anunț"
            >
              {/* Image skeleton */}
              <div className="aspect-[16/9] bg-[#111827]"></div>
              {/* Content skeleton */}
              <div className="p-5">
                <div className="h-7 bg-[#111827] rounded mb-2 w-3/4"></div>
                <div className="h-7 bg-[#111827] rounded mb-4 w-1/2"></div>
                <div className="h-5 bg-[#111827] rounded mb-2 w-full"></div>
                <div className="h-8 bg-[#111827] rounded mb-4 w-1/3"></div>
                <div className="h-4 bg-[#111827] rounded mb-2 w-full"></div>
                <div className="h-4 bg-[#111827] rounded mb-4 w-3/4"></div>
                <div className="h-10 bg-[#111827] rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          <div id="listings-results" className="mb-4 text-gray-400">
            Găsite {total} anunțuri{listings.length > 0 && ` (pagina ${page} din ${totalPages})`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {listings.map((listing, index) => (
              <article
                key={listing.id}
                className="group bg-[#161B22] rounded-2xl border border-white/5 overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:border-white/10 hover:shadow-[0_16px_40px_rgba(0,0,0,0.40)] hover:-translate-y-0.5 transition-all duration-300"
                aria-label={listing.title}
              >
                {/* Image - Fixed 16:9 Aspect Ratio */}
                <div className="relative aspect-[16/9] bg-[#111827] overflow-hidden">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      loading={index < 3 ? "eager" : "lazy"}
                      width={640}
                      height={360}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 leading-tight min-h-[3.5rem]">
                    {listing.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    {listing.make && <span>{listing.make}</span>}
                    {listing.model && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{listing.model}</span>
                      </>
                    )}
                    {listing.year && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{listing.year}</span>
                      </>
                    )}
                    {listing.mileage && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{new Intl.NumberFormat('ro-RO').format(listing.mileage)} km</span>
                      </>
                    )}
                  </div>

                  <div className="text-2xl font-bold text-white mb-4">
                    {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: listing.priceCurrency, maximumFractionDigits: 0 }).format(listing.priceAmount)}
                  </div>

                  {listing.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5rem]">
                      {listing.description}
                    </p>
                  )}

                  <Link
                    href={`/listings/${listing.id}`}
                    className="mt-auto block text-center h-11 px-4 rounded-[12px] bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] hover:from-[#5B4BFF] hover:to-[#4338CA] text-white font-semibold transition-all duration-300 shadow-[0_18px_50px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
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
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#1C212B] border border-white/10 rounded-[12px] text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
              >
                « Înapoi
              </button>
              
              <div className="flex gap-1">
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
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)] ${
                        page === pageNum
                          ? 'bg-[#1C212B] border border-white/10 text-white'
                          : 'bg-[#1C212B] border border-white/5 text-white/70 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[#1C212B] border border-white/10 rounded-[12px] text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
              >
                Înainte »
              </button>
            </div>
          )}

          {listings.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl mb-2">Nu s-au găsit anunțuri</p>
              <p>Încearcă să modifici filtrele</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
