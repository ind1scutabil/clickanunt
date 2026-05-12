'use client';

import React from 'react';

/**
 * TrustBadges Component
 *
 * Enterprise trust indicators displayed below hero section.
 * Only renders when NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI flag is enabled.
 * Uses native icons (no external libraries).
 */
export const TrustBadges: React.FC = () => {
  const isEnterpriseEnabled = process.env.NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI === 'true';

  if (!isEnterpriseEnabled) {
    return null;
  }

  const badges = [
    { icon: '📱', text: 'Verificare telefon + email' },
    { icon: '🔍', text: 'Moderare manuală' },
    { icon: '⚠️', text: 'Raportare instant' },
    { icon: '🛡️', text: 'Date stocate UE (GDPR)' },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 md:py-12">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#141821]/90 px-4 py-3 transition-[border-color,background-color] duration-normal ease-premium hover:border-white/12 hover:bg-[#161c26]"
          >
            <div className="flex-shrink-0 text-xl opacity-90">{badge.icon}</div>
            <div className="text-sm font-medium leading-snug text-white/80">{badge.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

TrustBadges.displayName = 'TrustBadges';

export default TrustBadges;
