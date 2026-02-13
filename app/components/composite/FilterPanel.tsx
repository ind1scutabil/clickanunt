/**
 * FilterPanel - Composite Component for Listings
 * 
 * Complete filter interface for search results
 * Combines: Card, Input, Select, Range slider, Checkbox, Button
 * 
 * @example
 * ```tsx
 * <FilterPanel
 *   onFilter={(filters) => handleFilter(filters)}
 *   category="Auto, moto"
 * />
 * ```
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, Button, Badge } from '@/app/components/ui';

export interface FilterPanelProps {
  category?: string;
  onFilter: (filters: FilterOptions) => void;
  onClear?: () => void;
}

export interface FilterOptions {
  priceMin?: number;
  priceMax?: number;
  location?: string;
  condition?: string;
  verified?: boolean;
  sortBy?: 'recent' | 'price-low' | 'price-high' | 'popular';
}

export default function FilterPanel({
  category,
  onFilter,
  onClear,
}: FilterPanelProps) {
  void category;
  const [filters, setFilters] = useState<FilterOptions>({
    priceMin: undefined,
    priceMax: undefined,
    location: '',
    condition: 'all',
    verified: false,
    sortBy: 'recent',
  });

  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterOptions>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onFilter(updatedFilters);
    },
    [filters, onFilter]
  );

  const handleClear = useCallback(() => {
    const defaultFilters: FilterOptions = {
      priceMin: undefined,
      priceMax: undefined,
      location: '',
      condition: 'all',
      verified: false,
      sortBy: 'recent',
    };
    setFilters(defaultFilters);
    onClear?.();
    onFilter(defaultFilters);
  }, [onFilter, onClear]);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== '' && v !== false && v !== 'all' && v !== 'recent'
  ).length;

  return (
    <Card variant="elevated" className="sticky top-24 mb-6">
      <Card.Body className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">Filtre</h3>
            {activeFilterCount > 0 && (
              <Badge variant="primary" size="sm">
                {activeFilterCount} activ
              </Badge>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition"
            aria-label="Toggle filters"
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div
          className={`space-y-6 ${
            isExpanded ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Price Range */}
          <div>
            <label className="block text-sm font-bold text-white mb-3">
              Preț
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Minim
                </label>
                <input
                  type="number"
                  placeholder="De la..."
                  value={filters.priceMin || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      priceMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Maxim
                </label>
                <input
                  type="number"
                  placeholder="Până la..."
                  value={filters.priceMax || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      priceMax: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-white mb-3">
              Locație
            </label>
            <input
              type="text"
              placeholder="Județ sau oraș"
              value={filters.location || ''}
              onChange={(e) =>
                handleFilterChange({ location: e.target.value })
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary-500/50 focus:outline-none"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-bold text-white mb-3">
              Stare
            </label>
            <select
              value={filters.condition || 'all'}
              onChange={(e) =>
                handleFilterChange({ condition: e.target.value })
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-500/50 focus:outline-none"
            >
              <option value="all">Toate</option>
              <option value="new">Nou</option>
              <option value="used">Folosit</option>
              <option value="refurbished">Recondiționat</option>
            </select>
          </div>

          {/* Verified */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verified || false}
                onChange={(e) =>
                  handleFilterChange({ verified: e.target.checked })
                }
                className="w-5 h-5 rounded bg-white/5 border border-white/10 checked:bg-primary-500 checked:border-primary-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-white">
                Doar anunțuri verificate
              </span>
            </label>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-bold text-white mb-3">
              Sortare
            </label>
            <select
              value={filters.sortBy || 'recent'}
              onChange={(e) =>
                handleFilterChange({
                  sortBy: e.target.value as FilterOptions['sortBy'],
                })
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-primary-500/50 focus:outline-none"
            >
              <option value="recent">Cele mai noi</option>
              <option value="price-low">Preț: scăzător</option>
              <option value="price-high">Preț: crescător</option>
              <option value="popular">Cele mai vizitate</option>
            </select>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            {activeFilterCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Șterge filtre
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => onFilter(filters)}
              className="w-full"
            >
              Aplică filtre
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
