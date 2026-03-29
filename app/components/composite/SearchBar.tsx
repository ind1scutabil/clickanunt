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
 * - Focus ring: indigo-500
 * - Button gradient: indigo-600 to purple-600
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
}) => {
  const [query, setQuery] = React.useState(defaultQuery);
  const [category, setCategory] = React.useState(defaultCategory);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
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
    <form onSubmit={handleSubmit} className={`max-w-4xl mx-auto ${className || ''}`}>
      <div className="flex flex-col sm:flex-row gap-4 w-full relative">
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
            className="h-[56px] w-full rounded-xl border border-white/[0.08] bg-[#0c1220] px-5 text-base text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.04),inset_0_-1px_2px_rgba(0,0,0,0.45)] transition-[box-shadow,border-color,background-color] duration-normal ease-premium placeholder:text-slate-500/75 placeholder:font-normal focus:border-primary-500/45 focus:bg-[#0a0f1a] focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.35),0_0_0_1px_rgba(139,92,246,0.12)]"
            style={{
              WebkitTextFillColor: 'white',
            }}
          />

          {/* Recent Searches Dropdown */}
          {isEnterpriseEnabled && showRecent && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#161B22] border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-700/50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ClockIcon />
                  Căutări recente
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentSearches.map((search, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-700/50 transition cursor-pointer border-b border-slate-700/30 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectRecent(search)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-white font-medium">{search.query}</div>
                      {search.category && (
                        <div className="text-xs text-gray-400">{search.category}</div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromRecentSearches(idx)}
                      className="text-gray-500 hover:text-gray-300 transition ml-2"
                      aria-label="Remove search"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {query.trim() && !recentSearches.some(s => s.query === query.trim()) && (
                <div className="border-t border-slate-700/50 p-3">
                  <button
                    type="button"
                    onClick={() => addToRecentSearches(query.trim(), category || undefined)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-white text-sm rounded-lg transition"
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
            className="h-[56px] w-full appearance-none rounded-xl border border-white/[0.08] bg-[#0c1220] px-5 text-base text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.04),inset_0_-1px_2px_rgba(0,0,0,0.45)] transition-[box-shadow,border-color,background-color] duration-normal ease-premium focus:border-primary-500/45 focus:bg-[#0a0f1a] focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.35),0_0_0_1px_rgba(139,92,246,0.12)] sm:w-48"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%94a3b8' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        )}

        {/* Search Button */}
        <button
          type="submit"
          aria-label="Search"
          className="flex h-[56px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_14px_rgba(88,28,135,0.35)] transition-[opacity,box-shadow,transform] duration-normal ease-premium hover:opacity-[0.96] hover:shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_6px_18px_rgba(88,28,135,0.4)] active:scale-[0.99]"
        >
          <SearchIcon />
          <span>Caută</span>
        </button>
      </div>
    </form>
  );
};

SearchBar.displayName = 'SearchBar';

export default SearchBar;

