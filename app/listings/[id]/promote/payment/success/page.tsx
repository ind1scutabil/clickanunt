'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { fetchWithAuthRefresh, clearStaleBrowserAuth } from '@/lib/admin-fetch';

type PaymentStatusResponse = {
  status: string;
  confirmed: boolean;
  promotionActive: boolean;
  promotionExpiresAt: string | null;
  error?: string;
};

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const paymentIntent = searchParams.get('payment_intent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const verifyPayment = useCallback(async () => {
    if (!paymentIntent) {
      setError('Lipsă identificator plată');
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuthRefresh(
        `/api/payments/by-intent/${encodeURIComponent(paymentIntent)}`,
        {
          headers: { Accept: 'application/json' },
        }
      );
      const data = (await res.json().catch(() => ({}))) as PaymentStatusResponse & {
        error?: string;
        listingId?: string | null;
      };

      if (res.status === 401) {
        clearStaleBrowserAuth();
        setError('Autentificare necesară pentru verificarea plății');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Nu am putut verifica plata');
        setLoading(false);
        return;
      }

      if (data.listingId && data.listingId !== id) {
        setError('Plata nu corespunde acestui anunț');
        setLoading(false);
        return;
      }

      if (data.confirmed) {
        setConfirmed(true);
        setPending(false);
        setExpiresAt(data.promotionExpiresAt);
        setLoading(false);
        return;
      }

      if (data.status === 'succeeded' && !data.promotionActive) {
        // Webhook may still be processing
        setPending(true);
        setLoading(false);
        return;
      }

      if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'refunded') {
        setError(`Plata nu a reușit (status: ${data.status})`);
        setLoading(false);
        return;
      }

      setPending(true);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify payment');
      setLoading(false);
    }
  }, [paymentIntent, id]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  useEffect(() => {
    if (!pending || confirmed || error) return;
    const t = setInterval(() => {
      void verifyPayment();
    }, 2500);
    return () => clearInterval(t);
  }, [pending, confirmed, error, verifyPayment]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Se verifică plata pe server...</p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Verificare plată</h1>
            <p className="text-gray-400 mb-8">{error}</p>
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}`)}
              className="px-8 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
            >
              Înapoi la anunț
            </button>
          </div>
        </main>
      </>
    );
  }

  if (pending && !confirmed) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-3">Plata este în curs de confirmare</h1>
            <p className="text-gray-400 mb-6">
              Redirectul Stripe nu este suficient. Așteptăm confirmarea server-side (webhook)
              înainte de a marca promovarea ca activă.
            </p>
            <button
              type="button"
              onClick={() => void verifyPayment()}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold mr-3"
            >
              Reîncearcă verificarea
            </button>
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}`)}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl"
            >
              Înapoi la anunț
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/50">
              <span className="text-5xl text-white" aria-hidden>
                OK
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Plată confirmată
          </h1>
          <p className="text-xl text-gray-400 mb-4">
            Promovarea anunțului a fost activată după confirmarea server-side.
          </p>
          {expiresAt ? (
            <p className="text-sm text-gray-500 mb-10">
              Expiră: {new Date(expiresAt).toLocaleString('ro-RO')}
            </p>
          ) : (
            <div className="mb-10" />
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => router.push(`/listings/${id}`)}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold"
            >
              Vezi anunțul
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/listings')}
              className="px-8 py-4 bg-gray-700 text-white rounded-xl font-bold"
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
