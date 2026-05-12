/**
 * SearchBar Component - Enterprise SaaS Grade
 * 
 * Premium search bar with dark theme, autofill fixes, and enterprise UX.
 * 
 * Styling Requirements:
 * - Input height: 56px (h-[56px])
 * - Border radius: rounded-xl
 * - Responsive layout: flex-col on mobile, flex-row on desktop
 * - Dark background: #0f172a
 * - White text: always
 * - Focus ring: primary (blue)
 * - Button: solid primary — no gradient
 * 
 * @example
 * ```tsx
 * <SearchBar
 *   onSearch={(query, category) => handleSearch(query, category)}
 * />
 * ```
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { SelectOption } from '@/app/components/ui';

export interface SearchBarProps {
  /**
   * Search callback triggered on form submit or Enter key
   */
  onSearch?: (query: string, category?: string) => void;
  
  /**
   * Placeholder text for search input
   */
  placeholder?: string;
  
  /**
   * Category options for dropdown
   */
  categories?: SelectOption[];
  
  /**
   * Show category filter
   */
  showCategory?: boolean;
  
  /**
   * Initial search query
   */
  defaultQuery?: string;
  
  /**
   * Initial category value
   */
  defaultCategory?: string;
  
  /**
   * Additional CSS classes for container
   */
  className?: string;

  /** Light shell, dark default, or premium (mobile.de–style dark panel + orange CTA) */
  variant?: "dark" | "light" | "premium";
}

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
  </svg>
);

interface RecentSearch {
  query: string;
  category?: string;
  timestamp: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Caută mașini, apartamente, telefoane...',
  categories = [
    { value: '', label: 'Toate categoriile' },
    { value: 'auto', label: 'Auto, moto și ambarcațiuni' },
    { value: 'imobiliare', label: 'Imobiliare' },
    { value: 'electronice', label: 'Electronice și electrocasnice' },
    { value: 'fashion', label: 'Modă și frumusețe' },
    { value: 'casa', label: 'Casă și grădină' },
    { value: 'sport', label: 'Sport și hobby' },
  ],
  showCategory = true,
  defaultQuery = '',
  defaultCategory = '',
  className,
  variant = "dark",
}) => {
  const isLight = variant === "light";
  const isPremium = variant === "premium";
  const [query, setQuery] = React.useState(defaultQuery);
  const [category, setCategory] = React.useState(defaultCategory);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  /** Always include „Toate categoriile” so controlled value="" matches an <option> — prevents hydration mismatch. */
  const categoryOptions = React.useMemo(() => {
    if (!showCategory) return categories;
    const hasAll = categories.some((c) => c.value === "");
    if (hasAll) return categories;
    return [{ value: "", label: "Toate categoriile" }, ...categories];
  }, [categories, showCategory]);

  React.useEffect(() => {
    if (!showCategory) return;
    if (categoryOptions.some((c) => c.value === category)) return;
    setCategory(categoryOptions[0]?.value ?? "");
  }, [categoryOptions, category, showCategory]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if enterprise UI is enabled
  const isEnterpriseEnabled = process.env.NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI === 'true';

  // Load recent searches from localStorage
  useEffect(() => {
    if (!isEnterpriseEnabled) return;
    
    try {
      const stored = localStorage.getItem('clickanunt_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, [isEnterpriseEnabled]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecent(false);
      }
    };

    if (showRecent) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRecent]);

  // Keyboard shortcuts: Cmd+K or Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToRecentSearches = (searchQuery: string, searchCategory?: string) => {
    if (!isEnterpriseEnabled || !searchQuery.trim()) return;

    const newSearch: RecentSearch = {
      query: searchQuery.trim(),
      category: searchCategory,
      timestamp: Date.now(),
    };

    // Remove duplicate if exists
    const filtered = recentSearches.filter(
      s => !(s.query === newSearch.query && s.category === newSearch.category)
    );

    // Keep only last 8 searches
    const updated = [newSearch, ...filtered].slice(0, 8);
    setRecentSearches(updated);

    try {
      localStorage.setItem('clickanunt_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent searches:', error);
    }
  };

  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    try {
      localStorage.setItem('clickanunt_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update recent searches:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addToRecentSearches(query.trim(), category || undefined);
      onSearch?.(query.trim(), category || undefined);
      setShowRecent(false);
    }
  };

  const handleSelectRecent = (search: RecentSearch) => {
    setQuery(search.query);
    if (search.category) {
      setCategory(search.category);
    }
    addToRecentSearches(search.query, search.category);
    onSearch?.(search.query, search.category);
    setShowRecent(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter key triggers search
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div
      className={`mx-auto w-full max-w-[720px] rounded-xl border p-2 sm:p-2.5 ${
        isPremium
          ? "max-w-none rounded-2xl border-white/10 bg-[#3d424d] p-3 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)] sm:p-3.5"
          : isLight
            ? "border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)]"
            : "rounded-lg border-white/[0.09] bg-[#16181f] shadow-[0_12px_40px_-28px_rgba(0,0,0,0.65)]"
      } ${className || ""}`}
    >
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
        {/* Search Input Container */}
        <div className="flex-1 relative" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => isEnterpriseEnabled && setShowRecent(true)}
            placeholder={placeholder}
            aria-label="Search products or services"
            className={`h-11 w-full rounded-md border px-3.5 text-[14px] shadow-none transition-[border-color,background-color] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
              isPremium
                ? "border-white/10 bg-[#2f343e] text-white placeholder:text-white/40 focus:border-[#ff4600]/50 focus:bg-[#282c34] focus:ring-[#ff4600]/20"
                : isLight
                  ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/25"
                  : "border-white/[0.09] bg-[#12151c] text-white/95 placeholder:text-white/35 focus:border-white/20 focus:bg-[#0e1116] focus:ring-white/15"
            }`}
            style={isLight ? undefined : { WebkitTextFillColor: "white" }}
          />

          {/* Recent Searches Dropdown */}
          {isEnterpriseEnabled && showRecent && recentSearches.length > 0 && (
            <div
              className={`absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border shadow-xl ${
                isLight ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#161B22]'
              }`}
            >
              <div className={`border-b p-3 ${isLight ? 'border-slate-100' : 'border-slate-700/50'}`}>
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
                    isLight ? 'text-slate-500' : 'text-gray-400'
                  }`}
                >
                  <ClockIcon />
                  Căutări recente
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentSearches.map((search, idx) => (
                  <div
                    key={idx}
                    className={`flex cursor-pointer items-center justify-between border-b px-4 py-2 transition last:border-b-0 ${
                      isLight
                        ? 'border-slate-100 hover:bg-slate-50'
                        : 'border-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectRecent(search)}
                      className="flex-1 text-left"
                    >
                      <div className={`text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {search.query}
                      </div>
                      {search.category && (
                        <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{search.category}</div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromRecentSearches(idx)}
                      className={`ml-2 transition ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-gray-500 hover:text-gray-300'}`}
                      aria-label="Remove search"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {query.trim() && !recentSearches.some(s => s.query === query.trim()) && (
                <div className={`border-t p-3 ${isLight ? 'border-slate-100' : 'border-slate-700/50'}`}>
                  <button
                    type="button"
                    onClick={() => addToRecentSearches(query.trim(), category || undefined)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      isLight
                        ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        : 'bg-slate-700/30 text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <SaveIcon />
                    Salvează căutarea
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Select */}
        {showCategory && (
          <select
            ref={selectRef}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category filter"
            className={`h-11 w-full appearance-none rounded-md border px-3.5 text-[14px] shadow-none transition-[border-color,background-color] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:min-w-[11rem] sm:max-w-[14rem] ${
              isPremium
                ? "border-white/10 bg-[#2f343e] text-white focus:border-[#ff4600]/50 focus:ring-[#ff4600]/20"
                : isLight
                  ? "border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500/25"
                  : "border-white/[0.09] bg-[#12151c] text-white/95 focus:border-white/20 focus:bg-[#0e1116] focus:ring-white/15"
            }`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${
                isLight ? "%2364758b" : isPremium ? "%23e4e4e7" : "%2394a3b8"
              }' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            {categoryOptions.map((cat) => (
              <option key={cat.value === "" ? "__all__" : cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        )}

        {/* Search Button */}
        <button
          type="submit"
          aria-label="Search"
          className={`flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 text-[14px] font-semibold transition-[background-color,opacity] duration-200 active:opacity-95 sm:min-w-[7.5rem] ${
            isPremium
              ? "border-transparent bg-[#ff4600] text-white shadow-[0_4px_14px_-4px_rgba(255,70,0,0.65)] hover:bg-[#e63e00] [&_svg]:text-white"
              : isLight
                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 [&_svg]:text-white"
                : "border-white/[0.12] bg-white text-neutral-900 hover:bg-white/95"
          }`}
        >
          <SearchIcon />
          <span>Caută</span>
        </button>
      </div>
    </form>
    </div>
  );
};

SearchBar.displayName = 'SearchBar';

export default SearchBar;

