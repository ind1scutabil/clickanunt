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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
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
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const county = searchParams.get('county');
    const city = searchParams.get('city');
    
    if (category || subcategory || county || city) {
      setFilters(prev => ({
        ...prev,
        ...(category && { category }),
        ...(subcategory && { subcategory }),
        ...(county && { county }),
        ...(city && { city }),
      }));
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
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
        ),
      });

      const res = await fetch(`/api/listings?${params}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load listings: ${res.status}`);
      }
      
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.pagination?.total || 0);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Toate anunțurile</h1>

      {/* Filters */}
      <div className={`relative overflow-hidden bg-gradient-to-br from-slate-800/80 via-purple-900/50 to-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl mb-8 border border-slate-700/50 transition-all duration-300 ${
        isFilterSticky ? 'lg:sticky lg:top-4 lg:z-40 lg:shadow-[#6366F1]/20 lg:shadow-2xl' : ''
      }`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-indigo-500/5 animate-gradient-xy"></div>
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Content */}
        <div className="relative">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtre
          </h2>

          {/* Main filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            {/* Category */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-200 mb-2 transition-colors group-hover:text-indigo-400">
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
                className="w-full px-4 py-3 border-2 border-slate-600/50 rounded-xl bg-slate-700/50 backdrop-blur-sm text-white shadow-sm hover:shadow-md hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
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
              <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-purple-600">
                Subcategorie
              </label>
              <select
                value={filters.subcategory || ''}
                onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                disabled={!filters.category}
                className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 disabled:bg-gray-100/80 disabled:cursor-not-allowed disabled:hover:shadow-sm"
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
              <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-pink-600">
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
                className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200"
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

          {/* Second row of filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            {/* City */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-indigo-600">
                Oraș
              </label>
              <select
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                disabled={!filters.county}
                className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 disabled:bg-gray-100/80 disabled:cursor-not-allowed disabled:hover:shadow-sm"
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
              <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-purple-600">
                Preț min (RON)
              </label>
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="5000"
                className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
              />
            </div>

            {/* Price Max */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-pink-600">
                Preț max (RON)
              </label>
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="50000"
                className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200"
              />
            </div>
          </div>

          {/* Auto-specific filters (shown only for Auto category) */}
          {isAutoCategory && (
            <div className="relative bg-gradient-to-br from-blue-400/20 via-indigo-400/20 to-purple-400/20 backdrop-blur-md p-6 rounded-2xl border-2 border-white/30 shadow-xl mb-5">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl"></div>
              <div className="relative">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-5 flex items-center gap-2">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Filtre Auto
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                  {/* Make */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-blue-600">
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
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-indigo-600">
                      Model
                    </label>
                    <select
                      value={filters.model || ''}
                      onChange={(e) => handleFilterChange('model', e.target.value)}
                      disabled={!filters.make}
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 disabled:bg-gray-100/80 disabled:cursor-not-allowed disabled:hover:shadow-sm"
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-purple-600">
                      Combustibil
                    </label>
                    <select
                      value={filters.fuel || ''}
                      onChange={(e) => handleFilterChange('fuel', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Transmission */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-blue-600">
                      Transmisie
                    </label>
                    <select
                      value={filters.transmission || ''}
                      onChange={(e) => handleFilterChange('transmission', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    >
                      <option value="">Orice transmisie</option>
                      <option value="Manuală">Manuală</option>
                      <option value="Automată">Automată</option>
                      <option value="Semi-automată">Semi-automată</option>
                    </select>
                  </div>

                  {/* Year Min */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-indigo-600">
                      An min
                    </label>
                    <input
                      type="number"
                      value={filters.yearMin || ''}
                      onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2010"
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                    />
                  </div>

                  {/* Year Max */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-purple-600">
                      An max
                    </label>
                    <input
                      type="number"
                      value={filters.yearMax || ''}
                      onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2024"
                      className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Non-auto year filters */}
          {!isAutoCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-indigo-600">
                  An min
                </label>
                <input
                  type="number"
                  value={filters.yearMin || ''}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2010"
                  className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                />
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-gray-800 mb-2 transition-colors group-hover:text-purple-600">
                  An max
                </label>
                <input
                  type="number"
                  value={filters.yearMax || ''}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2024"
                  className="w-full px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Sorting */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Sortare
            </label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="w-full md:w-80 px-4 py-3 border-2 border-white/50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            >
              <option value="createdAt-desc">Cele mai noi</option>
              <option value="createdAt-asc">Cele mai vechi</option>
              <option value="price-asc">Preț crescător</option>
              <option value="price-desc">Preț descrescător</option>
              <option value="year-desc">An fabricație descrescător</option>
              <option value="year-asc">An fabricație crescător</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadListings()}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Aplică filtre
            </button>
            <button
              onClick={clearFilters}
              className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-gray-900 px-8 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Resetează filtre
            </button>
          </div>
        </div>
      </div>

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
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#6366F1] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-full transition-all duration-200 group"
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
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Loading - Skeleton Cards */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/60 overflow-hidden animate-pulse"
              role="status"
              aria-label="Se încarcă anunț"
            >
              {/* Image skeleton */}
              <div className="aspect-[16/9] bg-slate-800"></div>
              {/* Content skeleton */}
              <div className="p-5">
                <div className="h-7 bg-slate-800 rounded mb-2 w-3/4"></div>
                <div className="h-7 bg-slate-800 rounded mb-4 w-1/2"></div>
                <div className="h-5 bg-slate-800 rounded mb-2 w-full"></div>
                <div className="h-8 bg-slate-800 rounded mb-4 w-1/3"></div>
                <div className="h-4 bg-slate-800 rounded mb-2 w-full"></div>
                <div className="h-4 bg-slate-800 rounded mb-4 w-3/4"></div>
                <div className="h-10 bg-slate-800 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          <div className="mb-4 text-gray-400">
            Găsite {total} anunțuri{listings.length > 0 && ` (pagina ${page} din ${totalPages})`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {listings.map((listing, index) => (
              <article
                key={listing.id}
                className="group bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/60 overflow-hidden hover:border-[#6366F1]/60 hover:shadow-2xl hover:shadow-[#6366F1]/20 transition-all duration-300"
                aria-label={listing.title}
              >
                {/* Image - Fixed 16:9 Aspect Ratio */}
                <div className="relative aspect-[16/9] bg-slate-800 overflow-hidden">
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

                  <div className="text-2xl font-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent mb-4">
                    {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: listing.priceCurrency, maximumFractionDigits: 0 }).format(listing.priceAmount)}
                  </div>

                  {listing.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5rem]">
                      {listing.description}
                    </p>
                  )}

                  <Link
                    href={`/listings/${listing.id}`}
                    className="mt-auto block text-center bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6366F1] text-white py-2.5 px-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2 focus:ring-offset-slate-900"
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
                className="px-4 py-2 bg-slate-900/70 border border-slate-700/60 rounded-md text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#6366F1]/60 hover:text-white"
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
                      className={`px-4 py-2 rounded-md ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white'
                          : 'bg-slate-900/70 border border-slate-700/60 text-gray-200 hover:border-[#6366F1]/60'
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
                className="px-4 py-2 bg-slate-900/70 border border-slate-700/60 rounded-md text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#6366F1]/60 hover:text-white"
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
