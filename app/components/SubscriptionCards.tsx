"use client";

/**
 * ORPHAN — not mounted in any production route (docs-only references).
 *
 * Defined: app/components/SubscriptionCards.tsx
 * Plans: free / business / premium from lib/monetization SUBSCRIPTION_PLANS
 * Prices: monetization placeholders (49.99 / 99.99 RON) — NOT approved live commercial products
 * Importers: none in app/ (only docs/features/MONETIZATION.md)
 * Manual model: account Business is offer → /contact; do NOT wire this into UI until products are approved
 *
 * Do not import into public pages. Prefer deletion in a separate cleanup PR after product sign-off.
 */
import { SUBSCRIPTION_PLANS } from "@/lib/monetization";

interface SubscriptionCardsProps {
  currentTier?: string;
  onSelectPlan: (tier: string) => void;
}

export default function SubscriptionCards({ currentTier = "free", onSelectPlan }: SubscriptionCardsProps) {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
    isCurrent: key === currentTier
  }));

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto p-6">
      {plans.map((plan) => (
        <div
          key={plan.key}
          className={`
            relative p-6 rounded-2xl border-2 transition-all
            ${plan.isCurrent 
              ? "border-green-500 bg-green-50" 
              : (plan as any).popular 
                ? "border-blue-500 bg-white shadow-xl scale-105" 
                : "border-gray-200 bg-white hover:border-gray-300"
            }
          `}
        >
          {/* Popular Badge */}
          {(plan as any).popular && !plan.isCurrent && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
              CEL MAI POPULAR
            </div>
          )}

          {/* Current Badge */}
          {plan.isCurrent && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
              PLAN CURENT
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {plan.label}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {plan.description}
            </p>
            
            {/* Price */}
            {plan.price === 0 ? (
              <div className="text-4xl font-bold text-gray-900">
                GRATUIT
              </div>
            ) : (
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {(plan.price / 100).toFixed(0)} <span className="text-xl">RON</span>
                </div>
                <div className="text-sm text-gray-500">
                  pe lună
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {plan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onSelectPlan(plan.key)}
            disabled={plan.isCurrent}
            className={`
              w-full py-3 rounded-lg font-bold transition-all
              ${plan.isCurrent
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : (plan as any).popular
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }
            `}
          >
            {plan.isCurrent ? "Plan Activ" : plan.price === 0 ? "Plan Actual" : "Upgrade Acum"}
          </button>

          {/* Savings */}
          {(plan as any).discount && (
            <p className="text-center text-sm text-green-600 font-medium mt-3">
              💰 {plan.key === "business" ? "Economisești 50% la promovări" : "5 promovări GRATUITE/lună"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
