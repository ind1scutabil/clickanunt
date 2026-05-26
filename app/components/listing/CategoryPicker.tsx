"use client";
import React, { useState, useMemo } from "react";
import { CATEGORIES } from "@/lib/carData";
import { TAXONOMY } from "@/lib/taxonomy";

interface CategoryPickerProps {
  selectedCategory: string;
  selectedSubcategory: string;
  onSelect: (category: string, subcategory: string) => void;
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Auto, moto și ambarcațiuni": "🚗",
  "Imobiliare": "🏠",
  "Electronice și electrocasnice": "📱",
  "Modă și frumusețe": "👗",
  "Casă și grădină": "🏡",
  "Sport, timp liber și artă": "⚽",
  "Copii și bebeluși": "🧸",
  "Animale de companie": "🐾",
  "Locuri de muncă": "💼",
  "Servicii și afaceri": "🔧",
  "Agricultură": "🌾",
  "Altele": "📦",
};

export default function CategoryPicker({
  selectedCategory,
  selectedSubcategory,
  onSelect,
  className = "",
}: CategoryPickerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string>(selectedCategory || "");

  const categories = useMemo(() => TAXONOMY.map((c) => c.label), []);

  const subcategories = useMemo(() => {
    if (!expandedCategory) return [];
    return CATEGORIES[expandedCategory] || [];
  }, [expandedCategory]);

  const handleCategoryClick = (cat: string) => {
    if (expandedCategory === cat) {
      setExpandedCategory("");
    } else {
      setExpandedCategory(cat);
    }
  };

  const handleSubcategoryClick = (sub: string) => {
    onSelect(expandedCategory, sub);
  };

  const handleCategoryOnly = (cat: string) => {
    onSelect(cat, "");
    setExpandedCategory(cat);
  };

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-[#0F1117] overflow-hidden ${className}`}>
      <div className="flex flex-col md:flex-row md:min-h-[360px]">
        {/* Left column: categories */}
        <div className="md:w-[280px] border-b md:border-b-0 md:border-r border-white/[0.06] overflow-y-auto max-h-[240px] md:max-h-[400px]">
          <div className="p-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                  expandedCategory === cat
                    ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    : selectedCategory === cat
                      ? "bg-white/[0.04] text-white border border-white/[0.08]"
                      : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className="text-lg shrink-0">{CATEGORY_ICONS[cat] || "📁"}</span>
                <span className="truncate font-medium">{cat}</span>
                <svg
                  className={`ml-auto h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    expandedCategory === cat ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: subcategories */}
        <div className="flex-1 overflow-y-auto max-h-[240px] md:max-h-[400px]">
          {expandedCategory ? (
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-300">
                  {CATEGORY_ICONS[expandedCategory]} {expandedCategory}
                </h4>
                <button
                  onClick={() => handleCategoryOnly(expandedCategory)}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Selectează fără subcategorie
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {subcategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => handleSubcategoryClick(sub)}
                    className={`px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      selectedCategory === expandedCategory && selectedSubcategory === sub
                        ? "bg-sky-500/15 text-sky-200 border border-sky-500/25 ring-1 ring-sky-500/10"
                        : "text-zinc-300 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="text-sm text-zinc-500">
                Selectează o categorie din stânga pentru a vedea subcategoriile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selection summary */}
      {selectedCategory && (
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-zinc-300">
            <span className="text-zinc-500">Selectat:</span>{" "}
            <span className="font-medium text-white">{selectedCategory}</span>
            {selectedSubcategory && (
              <span className="text-zinc-400"> / {selectedSubcategory}</span>
            )}
          </span>
          <button
            onClick={() => onSelect("", "")}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Resetează
          </button>
        </div>
      )}
    </div>
  );
}
