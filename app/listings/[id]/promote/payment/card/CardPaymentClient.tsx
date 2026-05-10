'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Navbar from '@/app/components/Navbar';
import { COMPANY_CONFIG } from '@/lib/company-config';
import { getCsrfToken } from '@/lib/security/csrf-client';

// Map short package names to Stripe enum values
const PACKAGE_MAPPING: Record<string, string> = {
  top: 'featured_7_days',
  urgent: 'featured_30_days',
  featured: 'featured_7_days',
  refresh: 'top_position_1_day',
};

function CheckoutForm({ listingId, onSuccess }: { listingId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe nu s-a încărcat încă. Te rugăm să aștepți...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/listings/${listingId}/promote/payment/success`,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }
    } catch (err: any) {
      // Avoid exposing test-card / test-mode wording to production users.
      setError('A apărut o eroare la procesarea plății');
      setLoading(false);
      return;
    }

    // On success, Stripe should redirect to `return_url` configured above.
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            terms: {
              card: 'never',
            },
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'RO',
                },
              },
            },
            wallets: {
              applePay: 'never',
              googlePay: 'never',
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">❌</span>
          <p className="text-red-400 text-sm flex-1">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Se procesează...
          </span>
        ) : (
          `✓ Plătește ${COMPANY_CONFIG.currency}`
        )}
      </button>

      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <p className="text-green-400 text-sm">Plata ta este protejată cu Stripe și criptare SSL 256-bit</p>
      </div>
    </form>
  );
}

export default function CardPaymentClient({
  listingId,
  packageId,
  price,
  stripePublishableKey,
}: {
  listingId: string;
  packageId: string | null;
  price: string | null;
  stripePublishableKey: string;
}) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [intentLoading, setIntentLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  /** Preferă prop (SSR din STRIPE_PUBLISHABLE_KEY); altfel citește aceeași valoare de pe server via API */
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe>>(() =>
    stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null)
  );

  useEffect(() => {
    if (stripePublishableKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payments/stripe-publishable-key', { cache: 'no-store' });
        const data = await res.json();
        const key = typeof data.publishableKey === 'string' ? data.publishableKey : '';
        if (!cancelled && key) setStripePromise(loadStripe(key));
      } catch {
        /* ignore — afișează Stripe neinițiat */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripePublishableKey]);

  useEffect(() => {
    const createIntent = async () => {
      try {
        setIntentLoading(true);
        setError('');

        if (!packageId) return;
        const fullPackageType = PACKAGE_MAPPING[packageId] || packageId;

        const csrfToken = await getCsrfToken();
        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (csrfToken) headers['x-csrf-token'] = csrfToken;
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            listingId,
            packageType: fullPackageType,
            packageId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (e: any) {
        setError(e?.message || 'Nu am putut inițializa plata. Te rugăm să încerci din nou.');
      } finally {
        setIntentLoading(false);
      }
    };

    if (listingId && packageId) {
      createIntent();
    }
  }, [listingId, packageId]);

  if (showSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-6xl">✅</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Plată Confirmată!</h1>
            <p className="text-gray-400 text-lg mb-8">Anunțul tău a fost promovat cu succes</p>
            <button
              onClick={() => router.push(`/listings/${listingId}`)}
              className="px-8 py-4 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-xl font-black text-lg hover:shadow-2xl transition-all"
            >
              ← Înapoi la anunț
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                💳 Plată cu Card Bancar
              </h1>
              <p className="text-gray-400">Introduceți detaliile cardului pentru a completa plata</p>
            </div>

            {price && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
                <div className="space-y-2 mb-4">
                  {(() => {
                    const priceNumber = parseFloat(price);
                    const subtotal = Math.round((priceNumber * 100) / (100 + COMPANY_CONFIG.vatRate));
                    const vat = priceNumber - subtotal;
                    return (
                      <>
                        <div className="flex justify-between items-center text-gray-300">
                          <span>Subtotal (fără TVA):</span>
                          <span className="font-medium">{subtotal.toFixed(2)} RON</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-300">
                          <span>TVA ({COMPANY_CONFIG.vatRate}%):</span>
                          <span className="font-medium">{vat.toFixed(2)} RON</span>
                        </div>
                        <div className="border-t border-blue-500/30 pt-2 flex justify-between items-center">
                          <span className="text-white font-bold">Total de plată:</span>
                          <span className="text-2xl font-black text-blue-400">{priceNumber.toFixed(2)} RON</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mt-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-300 space-y-1">
                  <div className="font-bold text-white mb-2">Beneficiar plată:</div>
                  <div>
                    <span className="text-gray-400">Companie:</span> {COMPANY_CONFIG.name}
                  </div>
                  <div>
                    <span className="text-gray-400">CUI/TVA:</span> {COMPANY_CONFIG.cui}
                  </div>
                </div>
              </div>
            )}

            {intentLoading && (
              <div className="text-center py-12">
                <div className="animate-spin text-6xl mb-4">⏳</div>
                <p className="text-gray-400">Se inițializează plata...</p>
              </div>
            )}

            {error && !intentLoading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                <span className="text-6xl mb-4 block">❌</span>
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
                >
                  ← Înapoi
                </button>
              </div>
            )}

            {clientSecret && !intentLoading && (
              <Elements
                stripe={stripePromise as any}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#6D5BFF',
                      colorBackground: '#1a1a2e',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'system-ui, sans-serif',
                      borderRadius: '12px',
                    },
                  },
                  paymentMethodCreation: 'manual',
                }}
              >
                <CheckoutForm listingId={listingId} onSuccess={() => setShowSuccess(true)} />
              </Elements>
            )}

            <button
              onClick={() => router.back()}
              className="w-full mt-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
            >
              ← Înapoi
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

