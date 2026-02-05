"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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

  useEffect(() => {
    loadListings();
  }, [page, filters]);

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
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  }

  function clearFilters() {
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setPage(1);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Toate anunțurile</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filtre</h2>
        
        {/* Main filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Categorie
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => {
                setFilters(prev => ({ 
                  ...prev, 
                  category: e.target.value,
                  subcategory: '', // Reset subcategory when category changes
                }));
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
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
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Subcategorie
            </label>
            <select
              value={filters.subcategory || ''}
              onChange={(e) => handleFilterChange('subcategory', e.target.value)}
              disabled={!filters.category}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Oraș
            </label>
            <select
              value={filters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              disabled={!filters.county}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Preț min (RON)
            </label>
            <input
              type="number"
              value={filters.priceMin || ''}
              onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>

          {/* Price Max */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Preț max (RON)
            </label>
            <input
              type="number"
              value={filters.priceMax || ''}
              onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="50000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
        </div>

        {/* Auto-specific filters (shown only for Auto category) */}
        {isAutoCategory && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Filtre Auto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Make */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
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
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Model
                </label>
                <select
                  value={filters.model || ''}
                  onChange={(e) => handleFilterChange('model', e.target.value)}
                  disabled={!filters.make}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Combustibil
                </label>
                <select
                  value={filters.fuel || ''}
                  onChange={(e) => handleFilterChange('fuel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Transmisie
                </label>
                <select
                  value={filters.transmission || ''}
                  onChange={(e) => handleFilterChange('transmission', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="">Orice transmisie</option>
                  <option value="Manuală">Manuală</option>
                  <option value="Automată">Automată</option>
                  <option value="Semi-automată">Semi-automată</option>
                </select>
              </div>

              {/* Year Min */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  An min
                </label>
                <input
                  type="number"
                  value={filters.yearMin || ''}
                  onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2010"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>

              {/* Year Max */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  An max
                </label>
                <input
                  type="number"
                  value={filters.yearMax || ''}
                  onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Non-auto year filters */}
        {!isAutoCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                An min
              </label>
              <input
                type="number"
                value={filters.yearMin || ''}
                onChange={(e) => handleFilterChange('yearMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2010"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                An max
              </label>
              <input
                type="number"
                value={filters.yearMax || ''}
                onChange={(e) => handleFilterChange('yearMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>
        )}

        {/* Sorting */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Sortare
          </label>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder }));
            }}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
          >
            <option value="createdAt-desc">Cele mai noi</option>
            <option value="createdAt-asc">Cele mai vechi</option>
            <option value="price-asc">Preț crescător</option>
            <option value="price-desc">Preț descrescător</option>
            <option value="year-desc">An fabricație descrescător</option>
            <option value="year-asc">An fabricație crescător</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadListings()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Aplică filtre
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md font-medium"
          >
            Resetează filtre
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Se încarcă anunțurile...</p>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          <div className="mb-4 text-gray-600">
            Găsite {total} anunțuri{listings.length > 0 && ` (pagina ${page} din ${totalPages})`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                {/* Image */}
                <div className="h-48 bg-gray-200 relative">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      📷 Fără poză
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                    {listing.title}
                  </h3>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {listing.make} {listing.model}
                    {listing.year && ` • ${listing.year}`}
                    {listing.mileage && ` • ${listing.mileage.toLocaleString()} km`}
                  </div>

                  <div className="text-2xl font-bold text-indigo-600 mb-4">
                    {listing.priceAmount.toLocaleString()} {listing.priceCurrency}
                  </div>

                  {listing.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                  )}

                  <Link
                    href={`/listings/${listing.id}`}
                    className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition"
                  >
                    Vezi detalii
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
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
                className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Înainte »
              </button>
            </div>
          )}

          {listings.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-600">
              <p className="text-xl mb-2">Nu s-au găsit anunțuri</p>
              <p>Încearcă să modifici filtrele</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
