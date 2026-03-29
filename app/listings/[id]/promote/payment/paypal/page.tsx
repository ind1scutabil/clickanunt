'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { COMPANY_CONFIG } from '@/lib/company-config';
import { getCsrfToken } from '@/lib/security/csrf-client';

export default function PayPalPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const packageId = searchParams.get('package');
  const price = searchParams.get('price');
  const amountBaniParam = searchParams.get('amountBani');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const amountBani =
    amountBaniParam != null && amountBaniParam !== ''
      ? parseInt(amountBaniParam, 10)
      : price != null && price !== ''
        ? Math.round(parseFloat(price) * 100)
        : NaN;

  const missingParams = !packageId || !Number.isFinite(amountBani) || amountBani < 100;

  const submitPromotion = async () => {
    if (missingParams) return;
    setSubmitting(true);
    setError('');
    try {
      const csrfToken = await getCsrfToken();
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!accessToken) {
        router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await fetch(`/api/listings/${id}/promote`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          packageId,
          amountBani,
          paymentMethod: 'paypal',
          paymentTransactionId: `PP-${Date.now()}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Nu am putut activa promovarea');
      }

      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la procesare');
    } finally {
      setSubmitting(false);
    }
  };

  if (missingParams) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <p className="text-white font-bold mb-4">Link incomplet</p>
            <p className="text-gray-400 text-sm mb-6">Reia fluxul din pagina de promovare.</p>
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}/promote`)}
              className="px-6 py-3 bg-[#0070BA] text-white rounded-xl font-bold"
            >
              Înapoi la promovare
            </button>
          </div>
        </main>
      </>
    );
  }

  if (showSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-6xl">✅</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Plată PayPal înregistrată</h1>
            <p className="text-gray-400 text-lg mb-8">Anunțul tău a fost promovat (flux manual / simulare)</p>
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}`)}
              className="px-8 py-4 bg-gradient-to-r from-[#0070BA] to-[#003087] text-white rounded-xl font-black text-lg hover:shadow-2xl transition-all"
            >
              ← Înapoi la anunț
            </button>
          </div>
        </main>
      </>
    );
  }

  const priceNumber = parseFloat(price || String(amountBani / 100));

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4 pb-16">
        <div className="text-center max-w-lg w-full">
          <div className="w-24 h-24 bg-[#0070BA] rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8.32 21.97a.546.546 0 01-.26-.32c-.03-.15-.01-.89.62-4.09.03-.16.06-.32.08-.47.18-.98.28-1.49.97-1.49h1.46c2.92 0 5.17-1.07 6.16-2.94.77-1.44.9-3.12.38-4.87-.03-.11-.07-.21-.11-.32.64.23 1.22.53 1.72.91 1.93 1.46 2.45 3.8 1.55 6.99-.98 3.45-3.82 5.6-7.25 5.6h-5.32z" />
              <path d="M11.85 6h-4.61c-.42 0-.79.31-.85.73l-1.88 12.06a.546.546 0 00.54.64h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.73.85-.73h1.97c4.07 0 6.42-2.01 7.03-5.99.29-1.82.01-3.25-.85-4.28C17.8 2.85 15.93 2 13.42 2h-4.61c-.42 0-.79.31-.85.73L6.08 9.68c-.06.42.24.77.66.77h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.54.48-.54z" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">PayPal</h1>
          <p className="text-gray-300 text-lg mb-2">
            Sumă: <span className="font-mono font-bold text-white">{priceNumber.toFixed(2)} RON</span>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            După ce finalizezi plata în PayPal (sau în modul simulare), apasă butonul de mai jos. Suma este verificată pe
            server.
          </p>

          <div className="max-w-lg mx-auto mb-8 bg-gray-800/60 border border-gray-700 rounded-2xl p-4 text-sm text-gray-300 text-left">
            <div className="font-bold text-white mb-3">Detalii plată</div>
            <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
              {(() => {
                const subtotal = Math.round((priceNumber * 100) / (100 + COMPANY_CONFIG.vatRate)) / 100;
                const vat = priceNumber - subtotal;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal (fără TVA):</span>
                      <span className="font-medium">{subtotal.toFixed(2)} RON</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">TVA ({COMPANY_CONFIG.vatRate}%):</span>
                      <span className="font-medium">{vat.toFixed(2)} RON</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-2">
                      <span>Total:</span>
                      <span>{priceNumber.toFixed(2)} RON</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-400">Beneficiar:</span> {COMPANY_CONFIG.name}
              </div>
              <div>
                <span className="text-gray-400">CUI:</span> {COMPANY_CONFIG.cui}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}/promote`)}
              className="px-6 py-3 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
            >
              ← Înapoi
            </button>
            <button
              type="button"
              onClick={() => void submitPromotion()}
              disabled={submitting}
              className="px-6 py-3 bg-[#0070BA] text-white rounded-xl font-black disabled:opacity-50"
            >
              {submitting ? 'Se procesează…' : 'Am finalizat plata — activează promovarea'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
