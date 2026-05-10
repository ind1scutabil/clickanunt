"use client";

import { useState } from "react";
import { PROMOTION_PRICING, calculatePromotionPrice } from "@/lib/monetization";
import { loadStripe } from "@stripe/stripe-js";

async function loadStripeFromServerConfig() {
  const res = await fetch("/api/payments/stripe-publishable-key", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const key = typeof data.publishableKey === "string" ? data.publishableKey : "";
  if (!res.ok || !key) {
    throw new Error("Plata cu cardul nu este configurată. Contactează suportul.");
  }
  return loadStripe(key);
}

interface PromotionModalProps {
  listingId: string;
  listingTitle: string;
  userId: string;
  subscriptionTier?: string;
  onClose: () => void;
}

export default function PromotionModal({
  listingId,
  listingTitle,
  userId,
  subscriptionTier = "free",
  onClose
}: PromotionModalProps) {
  const [selectedType, setSelectedType] = useState<string>("boost_72h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promotionOptions = Object.entries(PROMOTION_PRICING).map(([key, config]) => ({
    key,
    ...config,
    finalPrice: calculatePromotionPrice(key as any, subscriptionTier)
  }));

  const selectedPromotion = promotionOptions.find(p => p.key === selectedType);

  const handlePromote = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create promotion and get payment intent
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          userId,
          promotionType: selectedType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create promotion");
      }

      // If free promotion (Premium users)
      if (data.message?.includes("gratuit")) {
        alert("✅ Promovare activată gratuit!");
        onClose();
        window.location.reload();
        return;
      }

      const stripe = await loadStripeFromServerConfig();
      if (!stripe) {
        throw new Error("Stripe nu s-a încărcat");
      }

      // Confirm payment with Stripe Elements
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/listings/${listingId}?promoted=true`,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Promovează anunțul
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {listingTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Subscription Discount Banner */}
        {subscriptionTier !== "free" && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              🎉 {subscriptionTier === "business" ? "50% reducere Business" : "Promovare GRATUITĂ Premium"}
            </p>
          </div>
        )}

        {/* Promotion Options */}
        <div className="p-6 space-y-4">
          {promotionOptions.map((option) => (
            <div
              key={option.key}
              onClick={() => setSelectedType(option.key)}
              className={`
                relative p-5 border-2 rounded-xl cursor-pointer transition-all
                ${selectedType === option.key 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
                }
                ${(option as any).recommended ? "ring-2 ring-blue-400" : ""}
              `}
            >
              {(option as any).recommended && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  RECOMANDAT
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${selectedType === option.key ? "border-blue-500 bg-blue-500" : "border-gray-300"}
                    `}>
                      {selectedType === option.key && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {option.label}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-8">
                    {option.description}
                  </p>
                  <div className="mt-3 ml-8 space-y-1">
                    {option.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-blue-600 mt-2 ml-8">
                    {option.expectedViews}
                  </p>
                </div>

                <div className="text-right">
                  {option.finalPrice === 0 ? (
                    <div className="text-2xl font-bold text-green-600">
                      GRATUIT
                    </div>
                  ) : (
                    <>
                      {option.finalPrice !== option.price && (
                        <div className="text-sm text-gray-400 line-through">
                          {(option.price / 100).toFixed(2)} RON
                        </div>
                      )}
                      <div className="text-2xl font-bold text-gray-900">
                        {(option.finalPrice / 100).toFixed(2)} <span className="text-base">RON</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Total de plată</p>
              <p className="text-3xl font-bold text-gray-900">
                {selectedPromotion?.finalPrice === 0 
                  ? "GRATUIT" 
                  : `${(selectedPromotion?.finalPrice || 0) / 100} RON`
                }
              </p>
            </div>
            <button
              onClick={handlePromote}
              disabled={loading}
              className={`
                px-8 py-3 rounded-lg font-bold text-white transition-all
                ${loading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
                }
              `}
            >
              {loading ? "Se procesează..." : selectedPromotion?.finalPrice === 0 ? "Activează Gratuit" : "Continuă la plată"}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            🔒 Plată securizată prin Stripe • Refund dacă anunțul este respins
          </p>
        </div>
      </div>
    </div>
  );
}
