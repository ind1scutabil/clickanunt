'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/app/components/ui';

interface StatsData {
  available?: boolean;
  activeListings?: number;
  totalUsers?: number;
  listingViewsLast30d?: number;
  averageRating?: number;
}

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/**
 * StatsStripSafe Component
 * 
 * Enterprise metrics display with dynamic data fetching.
 * Only renders when NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI flag is enabled.
 * 
 * If dynamic stats API exists, fetches real data.
 * If not, displays "Date în curs de actualizare" with info icon.
 */
export const StatsStripSafe: React.FC = () => {
  // Check if enterprise UI is enabled
  const isEnterpriseEnabled = process.env.NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI === 'true';
  
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApiError, setHasApiError] = useState(false);

  useEffect(() => {
    // Attempt to fetch dynamic stats
    const fetchStats = async () => {
      try {
        // Try to fetch from hypothetical stats endpoint
        const response = await fetch('/api/stats', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = (await response.json()) as StatsData;
          if (data.available === false) {
            setStats(null);
            setHasApiError(true);
          } else {
            setStats(data);
            setHasApiError(false);
          }
        } else {
          setHasApiError(true);
        }
      } catch (error) {
        // API doesn't exist or is unreachable - use placeholder
        setHasApiError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Only render if enterprise UI is enabled
  if (!isEnterpriseEnabled) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-24">
      <Card 
        variant="elevated" 
        className="p-8 md:p-12 relative bg-[#1A1D24] border border-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] overflow-hidden"
      >
        {hasApiError || !stats ? (
          // Placeholder when API not available
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="text-gray-400">
                    <InfoIcon />
                  </div>
                  <div className="text-sm text-gray-400">Date în curs de actualizare</div>
                </div>
                <div className="h-8 w-32 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="transition-transform hover:scale-[1.02]">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">
                {typeof stats.activeListings === 'number'
                  ? stats.activeListings.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className="text-sm md:text-base text-gray-400">Anunțuri active</div>
              <div className="text-gray-500 mt-1 text-[11px]">Sursă: DB (count)</div>
            </div>
            <div className="transition-transform hover:scale-[1.02]">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">
                {typeof stats.totalUsers === 'number'
                  ? stats.totalUsers.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className="text-sm md:text-base text-gray-400">Utilizatori</div>
              <div className="text-gray-500 mt-1 text-[11px]">Sursă: DB (count)</div>
            </div>
            <div className="transition-transform hover:scale-[1.02]">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">
                {typeof stats.listingViewsLast30d === 'number'
                  ? stats.listingViewsLast30d.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className="text-sm md:text-base text-gray-400">Vizualizări anunțuri (30z)</div>
              <div className="text-gray-500 mt-1 text-[11px]">Sursă: analytics_events</div>
            </div>
            <div className="transition-transform hover:scale-[1.02]">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">
                {typeof stats.averageRating === 'number' && stats.averageRating > 0
                  ? `${stats.averageRating.toFixed(1)}★`
                  : '—'}
              </div>
              <div className="text-sm md:text-base text-gray-400">Rating mediu</div>
              <div className="text-gray-500 mt-1 text-[11px]">Sursă: DB (avg user rating)</div>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
};

StatsStripSafe.displayName = 'StatsStripSafe';

export default StatsStripSafe;
