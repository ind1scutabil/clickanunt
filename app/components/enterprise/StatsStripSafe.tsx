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
export const StatsStripSafe: React.FC<{ variant?: 'dark' | 'light' }> = ({ variant = 'dark' }) => {
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

  const showSkeleton = loading || hasApiError || !stats;
  const isLight = variant === 'light';

  return (
    <section className={`max-w-7xl mx-auto px-4 ${isLight ? 'py-12' : 'py-10 md:py-12'}`}>
      <Card 
        variant="elevated" 
        className={`relative overflow-hidden ${
          isLight
            ? 'border border-slate-200 bg-white p-8 shadow-sm md:p-12'
            : 'border border-white/[0.08] bg-[#181b22] p-6 shadow-sm md:p-10'
        }`}
      >
        {showSkeleton ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className={isLight ? 'text-slate-400' : 'text-white/35'}>
                    <InfoIcon />
                  </div>
                  <div className={`text-sm ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                    {loading ? "Se încarcă…" : "Date în curs de actualizare"}
                  </div>
                </div>
                <div className={`h-8 w-32 rounded animate-pulse ${isLight ? 'bg-slate-100' : 'bg-white/[0.06]'}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div>
              <div className={`text-3xl md:text-4xl font-semibold tabular-nums tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {typeof stats.activeListings === 'number'
                  ? stats.activeListings.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className={`text-sm md:text-base ${isLight ? 'text-slate-600' : 'text-white/45'}`}>Anunțuri active</div>
              <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-400' : 'text-white/35'}`}>Sursă: DB (count)</div>
            </div>
            <div>
              <div className={`text-3xl md:text-4xl font-semibold tabular-nums tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {typeof stats.totalUsers === 'number'
                  ? stats.totalUsers.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className={`text-sm md:text-base ${isLight ? 'text-slate-600' : 'text-white/45'}`}>Utilizatori</div>
              <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-400' : 'text-white/35'}`}>Sursă: DB (count)</div>
            </div>
            <div>
              <div className={`text-3xl md:text-4xl font-semibold tabular-nums tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {typeof stats.listingViewsLast30d === 'number'
                  ? stats.listingViewsLast30d.toLocaleString('ro-RO')
                  : '—'}
              </div>
              <div className={`text-sm md:text-base ${isLight ? 'text-slate-600' : 'text-white/45'}`}>Vizualizări anunțuri (30z)</div>
              <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-400' : 'text-white/35'}`}>Sursă: analytics_events</div>
            </div>
            <div>
              <div className={`text-3xl md:text-4xl font-semibold tabular-nums tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {typeof stats.averageRating === 'number' && stats.averageRating > 0
                  ? `${stats.averageRating.toFixed(1)}★`
                  : '—'}
              </div>
              <div className={`text-sm md:text-base ${isLight ? 'text-slate-600' : 'text-white/45'}`}>Rating mediu</div>
              <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-400' : 'text-white/35'}`}>Sursă: DB (avg user rating)</div>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
};

StatsStripSafe.displayName = 'StatsStripSafe';

export default StatsStripSafe;
