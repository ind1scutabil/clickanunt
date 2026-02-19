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
  // Check if enterprise UI is enabled
  const isEnterpriseEnabled = process.env.NEXT_PUBLIC_ENTERPRISE_CRITICAL_UI === 'true';

  if (!isEnterpriseEnabled) {
    return null;
  }

  const badges = [
    {
      icon: '📱',
      text: 'Verificare telefon + email',
      color: 'from-blue-500/10 to-blue-600/10',
      border: 'border-blue-500/20',
    },
    {
      icon: '🔍',
      text: 'Moderare manuală',
      color: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/20',
    },
    {
      icon: '⚠️',
      text: 'Raportare instant',
      color: 'from-amber-500/10 to-amber-600/10',
      border: 'border-amber-500/20',
    },
    {
      icon: '🛡️',
      text: 'Date stocate UE (GDPR)',
      color: 'from-green-500/10 to-green-600/10',
      border: 'border-green-500/20',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 -mt-8 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${badge.border} bg-gradient-to-br ${badge.color} backdrop-blur-xl transition-all hover:border-opacity-40 hover:shadow-lg`}
          >
            <div className="text-2xl flex-shrink-0">{badge.icon}</div>
            <div className="text-sm text-white/90 font-medium">{badge.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

TrustBadges.displayName = 'TrustBadges';

export default TrustBadges;
