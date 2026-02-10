/**
 * Promotion & Monetization Configuration
 * Non-intrusive monetization with clear value proposition
 */

export const PROMOTION_PRICING = {
  boost_24h: {
    price: 999,        // 9.99 RON
    currency: "RON",
    duration: 24,      // hours
    label: "Boost 24h",
    description: "Anunțul tău va fi afișat mai sus 24 ore",
    benefits: [
      "Poziționare prioritară în listă",
      "3-5x mai multe vizualizări",
      "Badge discret 'Promovat'",
      "Refund dacă respins la moderare"
    ],
    expectedViews: "3-5x mai multe vizualizări"
  },
  boost_72h: {
    price: 1999,       // 19.99 RON
    currency: "RON",
    duration: 72,      // hours
    label: "Boost 72h",
    description: "Anunțul tău va fi afișat mai sus 72 ore",
    benefits: [
      "Poziționare prioritară 3 zile",
      "5-8x mai multe vizualizări",
      "Badge discret 'Promovat'",
      "Refund dacă respins la moderare"
    ],
    expectedViews: "5-8x mai multe vizualizări",
    recommended: true  // Show as recommended option
  },
  boost_7days: {
    price: 3999,       // 39.99 RON
    currency: "RON",
    duration: 168,     // hours (7 days)
    label: "Boost 7 zile",
    description: "Anunțul tău va fi afișat mai sus 7 zile",
    benefits: [
      "Poziționare prioritară 7 zile",
      "10-15x mai multe vizualizări",
      "Badge discret 'Promovat'",
      "Refund dacă respins la moderare"
    ],
    expectedViews: "10-15x mai multe vizualizări"
  },
  highlight: {
    price: 1499,       // 14.99 RON
    currency: "RON",
    duration: 168,     // hours (7 days)
    label: "Highlight",
    description: "Anunțul tău va fi diferențiat vizual",
    benefits: [
      "Diferențiere vizuală elegantă",
      "Atrage atenția cumpărătorilor",
      "Valabil 7 zile",
      "Compatibil cu Boost"
    ],
    expectedViews: "2-3x mai mult engagement"
  }
} as const;

export const SUBSCRIPTION_PLANS = {
  free: {
    price: 0,
    currency: "RON",
    label: "FREE",
    description: "Pentru utilizatori ocazionali",
    features: [
      "Publicare gratuită",
      "10 anunțuri active simultan",
      "Mesaje și vizibilitate normală",
      "Moderare standard (1-2 ore)"
    ],
    limits: {
      listingsPerDay: 10,
      activeListings: 10,
      messagesPerHour: 20,
      moderationPriority: "standard"
    }
  },
  business: {
    price: 4999,       // 49.99 RON/lună
    currency: "RON",
    interval: "month",
    label: "BUSINESS",
    description: "Pentru vânzători activi",
    features: [
      "30 anunțuri active simultan",
      "Publicare instant (fără moderare)",
      "Badge 'Business Verificat'",
      "Suport prioritar",
      "50% reducere la promovări",
      "Statistici avansate"
    ],
    limits: {
      listingsPerDay: 30,
      activeListings: 30,
      messagesPerHour: 100,
      moderationPriority: "instant"
    },
    discount: {
      promotions: 0.5  // 50% discount on promotions
    },
    popular: true
  },
  premium: {
    price: 9999,       // 99.99 RON/lună
    currency: "RON",
    interval: "month",
    label: "PREMIUM",
    description: "Pentru profesioniști și dealeri",
    features: [
      "Anunțuri active nelimitate",
      "Publicare instant (fără moderare)",
      "Badge 'Premium Verificat'",
      "Suport dedicat 24/7",
      "Promovări GRATUITE (5/lună)",
      "Statistici complete + export",
      "Poziționare preferențială",
      "Pagină dealer personalizată"
    ],
    limits: {
      listingsPerDay: 100,
      activeListings: -1,  // unlimited
      messagesPerHour: 500,
      moderationPriority: "instant",
      freePromotionsPerMonth: 5
    },
    discount: {
      promotions: 1.0  // 100% discount on promotions (up to 5/month)
    }
  }
} as const;

// Promotion limits to prevent spam
export const PROMOTION_LIMITS = {
  maxHighlightedPerPage: 3,      // Max 3 highlighted per page (15% of 20)
  maxPromotedPerPage: 10,         // Max 10 promoted per page (50% of 20)
  minViewsForPromotion: 5,        // Minimum views before showing promotion offer
  minHoursSincePublish: 2,        // Minimum 2 hours since publish to promote
  maxPromotionsPerListing: 10,    // Max 10 promotions per listing lifetime
} as const;

// When to show promotion offers (UX guidelines)
export const PROMOTION_TRIGGERS = {
  afterPublish: {
    delay: 3600000,  // 1 hour after publish (in ms)
    message: "Anunțul tău a fost publicat! Crește vizibilitatea cu un Boost."
  },
  lowViews: {
    threshold: 10,    // Less than 10 views after 24h
    message: "Anunțul tău are puține vizualizări. Un Boost te ajută să ajungi la mai mulți cumpărători."
  },
  noMessages: {
    threshold: 48,    // 48 hours without messages
    message: "Primește mai multe mesaje cu un Boost pentru anunțul tău."
  },
  beforeExpiry: {
    daysRemaining: 7, // 7 days before expiry
    message: "Anunțul tău expiră în curând. Prelungește vizibilitatea cu un Boost."
  }
} as const;

// Calculate discount based on subscription tier
export function getPromotionDiscount(tier: string): number {
  if (tier === "business") return 0.5;  // 50% off
  if (tier === "premium") return 1.0;   // 100% off (free)
  return 0;  // No discount
}

// Calculate final price with discount
export function calculatePromotionPrice(
  type: keyof typeof PROMOTION_PRICING,
  tier: string = "free"
): number {
  const basePrice = PROMOTION_PRICING[type].price;
  const discount = getPromotionDiscount(tier);
  return Math.round(basePrice * (1 - discount));
}

// Check if promotion is allowed
export function canPromoteListing(
  listing: {
    createdAt: Date;
    views: number;
    promotionCount?: number;
  }
): {
  allowed: boolean;
  reason?: string;
} {
  const hoursSincePublish = (Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSincePublish < PROMOTION_LIMITS.minHoursSincePublish) {
    return {
      allowed: false,
      reason: `Trebuie să aștepți ${PROMOTION_LIMITS.minHoursSincePublish} ore după publicare`
    };
  }
  
  if (listing.views < PROMOTION_LIMITS.minViewsForPromotion) {
    return {
      allowed: false,
      reason: "Anunțul necesită cel puțin 5 vizualizări înainte de promovare"
    };
  }
  
  if ((listing.promotionCount || 0) >= PROMOTION_LIMITS.maxPromotionsPerListing) {
    return {
      allowed: false,
      reason: "Ai atins limita maximă de promovări pentru acest anunț"
    };
  }
  
  return { allowed: true };
}

// Get subscription benefits summary
export function getSubscriptionBenefits(tier: string) {
  const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) return null;
  
  return {
    name: plan.label,
    price: plan.price,
    features: plan.features,
    limits: plan.limits,
    savings: tier === "business" ? "50% reducere promovări" : tier === "premium" ? "5 promovări GRATUITE/lună" : null
  };
}

export type PromotionType = keyof typeof PROMOTION_PRICING;
export type SubscriptionTier = keyof typeof SUBSCRIPTION_PLANS;
