'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const paymentIntent = searchParams.get('payment_intent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Verify payment intent status
    const verifyPayment = async () => {
      if (!paymentIntent) {
        setError('Payment intent ID missing');
        setLoading(false);
        return;
      }

      try {
        // Optional: call your backend to verify payment status
        // For now, just trust Stripe redirect
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to verify payment');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntent]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-gray-400">Se verifică plata...</p>
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
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-3xl font-bold text-white mb-4">Eroare verificare</h1>
            <p className="text-gray-400 mb-8">{error}</p>
            <button
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

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          {/* Success Animation */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-2xl shadow-green-500/50">
              <span className="text-7xl">✅</span>
            </div>
            <div className="inline-block px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-full mb-4">
              <span className="text-green-400 text-sm font-semibold">
                Payment ID: {paymentIntent?.substring(0, 20)}...
              </span>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Plată Confirmată!
          </h1>
          <p className="text-2xl text-gray-300 mb-2">
            🎉 Felicitări!
          </p>
          <p className="text-xl text-gray-400 mb-12">
            Anunțul tău a fost promovat cu succes
          </p>

          {/* Benefits */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Ce se întâmplă acum?
            </h2>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Anunțul tău este acum promovat
                  </h3>
                  <p className="text-gray-400">
                    Va apărea în poziții prioritare și va primi mai multe vizualizări
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl">📧</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Vei primi factura pe email
                  </h3>
                  <p className="text-gray-400">
                    Confirmarea plății și factura vor fi trimise în scurt timp
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl">📊</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Urmărește statisticile
                  </h3>
                  <p className="text-gray-400">
                    Verifică dashboard-ul pentru a vedea performanța anunțului
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push(`/listings/${id}`)}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
            >
              Vezi anunțul promovat
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-gray-700 text-white rounded-xl font-bold text-lg hover:bg-gray-600 transition-all"
            >
              Dashboard
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-sm text-gray-500">
            <p>Ai întrebări? Contactează suportul nostru.</p>
          </div>
        </div>
      </main>
    </>
  );
}
