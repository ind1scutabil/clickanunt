import type { AccountType, VerificationLevel } from '@prisma/client';

// Verification badges configuration
export const VERIFICATION_BADGES = {
  none: {
    label: 'Neverificat',
    color: 'gray',
    icon: '○',
    description: 'Cont fără verificare'
  },
  email: {
    label: 'Email verificat',
    color: 'blue',
    icon: '✓',
    description: 'Adresa de email este verificată'
  },
  phone: {
    label: 'Telefon verificat',
    color: 'green',
    icon: '✓✓',
    description: 'Email și telefon verificate'
  },
  business: {
    label: 'Business verificat',
    color: 'purple',
    icon: '✓✓✓',
    description: 'Business verificat cu documente oficiale'
  }
} as const;

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'FREE',
    price: 0,
    currency: 'RON',
    interval: 'lifetime',
    features: [
      'Postări nelimitate gratuite',
      'Toate categoriile disponibile',
      'Profil public basic',
      'Suport comunitate',
      'Moderare standard (2-24h)'
    ],
    limits: {
      activeListings: 10,
      photosPerListing: 5,
      boostsPerMonth: 0,
      highlightsPerMonth: 0,
      instantPublish: false,
      featuredListings: false,
      prioritySupport: false
    }
  },
  business: {
    name: 'BUSINESS',
    price: 49.99,
    currency: 'RON',
    interval: 'month',
    features: [
      '50 postări active simultan',
      'Până la 15 poze per anunț',
      '3 boost-uri gratuite/lună',
      'Publicare instant (fără moderare)',
      'Badge "Business Verificat"',
      'Profil business complet cu logo',
      'Statistici avansate',
      'Suport prioritar',
      '50% discount la toate promoțiile'
    ],
    limits: {
      activeListings: 50,
      photosPerListing: 15,
      boostsPerMonth: 3,
      highlightsPerMonth: 0,
      instantPublish: true,
      featuredListings: false,
      prioritySupport: true
    },
    promotionDiscount: 0.5 // 50% discount
  },
  premium: {
    name: 'PREMIUM',
    price: 99.99,
    currency: 'RON',
    interval: 'month',
    features: [
      'Postări nelimitate',
      'Până la 30 poze per anunț',
      '5 boost-uri + 2 highlight-uri gratuite/lună',
      'Publicare instant',
      'Badge "Premium"',
      'Profil business premium',
      '1 anunț featured permanent',
      'Statistici complete + analytics',
      'Suport prioritar 24/7',
      'Acces API pentru integrări',
      '100% discount la promoții (toate gratuite)'
    ],
    limits: {
      activeListings: -1, // unlimited
      photosPerListing: 30,
      boostsPerMonth: 5,
      highlightsPerMonth: 2,
      instantPublish: true,
      featuredListings: 1,
      prioritySupport: true
    },
    promotionDiscount: 1.0 // 100% discount (free)
  }
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

// Get plan limits for a user
export function getPlanLimits(tier: keyof typeof SUBSCRIPTION_PLANS) {
  return SUBSCRIPTION_PLANS[tier].limits;
}

// Check if user can perform action based on their plan
export function canPerformAction(
  tier: keyof typeof SUBSCRIPTION_PLANS,
  action: keyof typeof SUBSCRIPTION_PLANS.free.limits,
  currentCount?: number
): boolean {
  const limits = getPlanLimits(tier);
  const limit = limits[action];
  
  // Boolean limits
  if (typeof limit === 'boolean') {
    return limit;
  }
  
  // Numeric limits
  if (typeof limit === 'number') {
    if (limit === -1) return true; // unlimited
    if (currentCount === undefined) return true; // can't check without count
    return currentCount < limit;
  }
  
  return false;
}

// Get verification badge info
export function getVerificationBadge(level: VerificationLevel) {
  return VERIFICATION_BADGES[level as keyof typeof VERIFICATION_BADGES];
}

// Check if user can upgrade to business account
export function canUpgradeToBusiness(
  currentAccountType: AccountType,
  verificationLevel: VerificationLevel
): { can: boolean; reason?: string } {
  if (currentAccountType === 'business') {
    return { can: false, reason: 'Deja ai cont business' };
  }
  
  // Minimum email verification required
  if (verificationLevel === 'none') {
    return { 
      can: false, 
      reason: 'Verifică emailul înainte de a activa contul business' 
    };
  }
  
  return { can: true };
}

// Check if user can request business verification
export function canRequestBusinessVerification(
  accountType: AccountType,
  verificationLevel: VerificationLevel,
  hasBusinessInfo: boolean
): { can: boolean; reason?: string } {
  if (accountType !== 'business') {
    return { 
      can: false, 
      reason: 'Contul trebuie să fie de tip business' 
    };
  }
  
  if (verificationLevel === 'business') {
    return { 
      can: false, 
      reason: 'Business-ul este deja verificat' 
    };
  }
  
  if (verificationLevel === 'none' || verificationLevel === 'email') {
    return { 
      can: false, 
      reason: 'Verifică telefon înainte de a solicita verificare business' 
    };
  }
  
  if (!hasBusinessInfo) {
    return { 
      can: false, 
      reason: 'Completează informațiile business (nume, CUI, registrul comerțului)' 
    };
  }
  
  return { can: true };
}

// Calculate remaining free promotions
export function getRemainingFreePromotions(
  tier: keyof typeof SUBSCRIPTION_PLANS,
  usedBoosts: number,
  usedHighlights: number,
  freeBoostsRemaining: number
): {
  boosts: number;
  highlights: number;
  total: number;
} {
  const limits = getPlanLimits(tier);
  
  // For premium users with discount = 1.0, all promotions are free
  if (tier === 'premium') {
    return {
      boosts: Math.max(0, limits.boostsPerMonth - usedBoosts),
      highlights: Math.max(0, limits.highlightsPerMonth - usedHighlights),
      total: Math.max(0, limits.boostsPerMonth + limits.highlightsPerMonth - usedBoosts - usedHighlights)
    };
  }
  
  // For business users, track free boosts
  if (tier === 'business') {
    const remainingBoosts = Math.max(0, limits.boostsPerMonth - usedBoosts);
    return {
      boosts: Math.min(remainingBoosts, freeBoostsRemaining),
      highlights: 0,
      total: Math.min(remainingBoosts, freeBoostsRemaining)
    };
  }
  
  return { boosts: 0, highlights: 0, total: 0 };
}

// Get promotion discount for user
export function getPromotionDiscount(tier: keyof typeof SUBSCRIPTION_PLANS): number {
  const plan = SUBSCRIPTION_PLANS[tier];
  return 'promotionDiscount' in plan ? plan.promotionDiscount : 0;
}

// Format price with currency
export function formatPrice(amount: number, currency: string = 'RON'): string {
  if (amount === 0) return 'Gratuit';
  return `${amount.toFixed(2)} ${currency}`;
}

// Get plan comparison for UI
export function getPlanComparison() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
    isPopular: key === 'business',
    isRecommended: key === 'premium'
  }));
}

// Check if user should be prompted to upgrade
export function shouldPromptUpgrade(
  tier: keyof typeof SUBSCRIPTION_PLANS,
  activeListingsCount: number,
  recentRejections: number
): { should: boolean; reason?: string; recommendedPlan?: SubscriptionPlanKey } {
  if (tier === 'premium') {
    return { should: false };
  }
  
  const limits = getPlanLimits(tier);
  
  // Close to listing limit
  if (limits.activeListings > 0 && activeListingsCount >= limits.activeListings * 0.8) {
    return {
      should: true,
      reason: `Ai ${activeListingsCount} din ${limits.activeListings} anunțuri active. Upgrade pentru mai multe.`,
      recommendedPlan: tier === 'free' ? 'business' : 'premium'
    };
  }
  
  // Multiple rejections (lack of instant publish)
  if (tier === 'free' && recentRejections >= 2) {
    return {
      should: true,
      reason: 'Anunțurile tale trec prin moderare. Business și Premium au publicare instant.',
      recommendedPlan: 'business'
    };
  }
  
  return { should: false };
}
