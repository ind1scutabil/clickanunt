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

import React, { useRef, useEffect } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim(), category || undefined);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter key triggers search
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`max-w-4xl mx-auto ${className || ''}`}>
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {/* Search Input Container */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            aria-label="Search products or services"
            className="h-[56px] w-full bg-[#0f172a] text-white placeholder:text-slate-400 border border-slate-700 rounded-xl px-5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            style={{
              WebkitTextFillColor: 'white',
            }}
          />
        </div>

        {/* Category Select */}
        {showCategory && (
          <select
            ref={selectRef}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category filter"
            className="h-[56px] w-full sm:w-48 bg-[#0f172a] text-white border border-slate-700 rounded-xl px-5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none"
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
          className="h-[56px] px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition whitespace-nowrap flex items-center justify-center gap-2"
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

