/**
 * Car Makes Grid Component
 * Displays all car makes like Auto1.com with search and filter
 */

'use client';

import React, { useState, useMemo } from "react";
import {
  PREMIUM_CAR_MAKES,
  getModelsByMake,
} from "@/lib/carMakesWithLogos";
import { getCarLogoSVG } from "@/app/components/CarLogos";

interface CarMakesGridProps {
  onSelectMake?: (makeName: string) => void;
  selectedMake?: string;
  compact?: boolean;
}

export function CarMakesGrid({
  onSelectMake,
  selectedMake,
  compact = false,
}: CarMakesGridProps) {
  const [expandedMake, setExpandedMake] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("");

  // Filter makes based on search and country
  const filteredMakes = useMemo(() => {
    return PREMIUM_CAR_MAKES.filter((make) => {
      const matchesSearch = make.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCountry = filterCountry ? make.country === filterCountry : true;
      return matchesSearch && matchesCountry;
    });
  }, [searchQuery, filterCountry]);

  // Get unique countries
  const countries = useMemo(() => {
    return Array.from(new Set(PREMIUM_CAR_MAKES.map((m) => m.country))).sort();
  }, []);

  const featuredMakes = filteredMakes.filter((m) => m.featured);

  return (
    <div className="w-full">
      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search car brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Country Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCountry("")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              !filterCountry
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Countries ({PREMIUM_CAR_MAKES.length})
          </button>
          {countries.map((country) => {
            const count = PREMIUM_CAR_MAKES.filter(
              (m) => m.country === country
            ).length;
            return (
              <button
                key={country}
                onClick={() => setFilterCountry(country)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterCountry === country
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {country} ({count})
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Found {filteredMakes.length} brands
        </div>
      </div>

      {!compact && featuredMakes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Popular Brands</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredMakes.map((make) => (
              <button
                key={make.id}
                onClick={() => {
                  onSelectMake?.(make.name);
                  setExpandedMake(make.id === expandedMake ? null : make.id);
                }}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                  selectedMake === make.name
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2">
                  {getCarLogoSVG(make.name)}
                </div>
                <div className="font-semibold text-sm text-gray-900">
                  {make.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {make.models.length} models
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Makes Section */}
      <div>
        {!compact && (
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {searchQuery || filterCountry ? "Search Results" : "All Brands"}
          </h2>
        )}
        <div className={`grid ${compact ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'} gap-3`}>
          {filteredMakes.map((make) => (
            <div key={make.id} className="flex flex-col">
              <button
                onClick={() => {
                  onSelectMake?.(make.name);
                  setExpandedMake(make.id === expandedMake ? null : make.id);
                }}
                className={`p-3 rounded-lg border transition-all text-center ${
                  selectedMake === make.name
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2">
                  {getCarLogoSVG(make.name)}
                </div>
                <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                  {make.name}
                </div>
                {!compact && (
                  <div className="text-xs text-gray-500">{make.country}</div>
                )}
              </button>

              {/* Expandable models list */}
              {expandedMake === make.id && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Popular Models:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getModelsByMake(make.name)
                      .slice(0, 6)
                      .map((model) => (
                        <span
                          key={model}
                          className="text-xs bg-white border border-gray-300 rounded px-2 py-1"
                        >
                          {model.split("(")[0].trim()}
                        </span>
                      ))}
                    {getModelsByMake(make.name).length > 6 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{getModelsByMake(make.name).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredMakes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No brands found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Makes List Component
 * Simple list format for dropdowns or filters
 */
export function CarMakesDropdown({
  onSelectMake,
  selectedMake,
}: CarMakesGridProps) {
  return (
    <div className="space-y-2">
      {PREMIUM_CAR_MAKES.map((make) => (
        <button
          key={make.id}
          onClick={() => onSelectMake?.(make.name)}
          className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${
            selectedMake === make.name
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="w-8 h-8 flex-shrink-0">
            {getCarLogoSVG(make.name)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{make.name}</div>
            <div className="text-xs text-gray-500">{make.models.length} models available</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Make Details Component
 * Shows detailed info about a selected make
 */
export function MakeDetails({ makeName }: { makeName: string }) {
  const make = PREMIUM_CAR_MAKES.find(
    (m) => m.name.toLowerCase() === makeName.toLowerCase()
  );

  if (!make) return null;

  const models = getModelsByMake(makeName);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-6 mb-6">
        <div className="w-24 h-24">
          {getCarLogoSVG(make.name)}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{make.name}</h1>
          <p className="text-gray-600 mt-1">🌍 {make.country}</p>
          <p className="text-lg text-blue-600 font-semibold mt-2">
            {models.length} Models Available
          </p>
        </div>
      </div>

      {/* Model Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Available Models</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {models.map((model) => (
            <div
              key={model}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="font-semibold text-sm text-gray-900">
                {model.split("(")[0].trim()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {model.includes("(") && `(${model.split("(")[1]}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
