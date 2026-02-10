'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { COMPANY_CONFIG } from '@/lib/company-config';

export default function PayPalPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const packageId = searchParams.get('package');
  const price = searchParams.get('price');

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Simulare redirecționare la PayPal și return
    const simulatePayPalPayment = async () => {
      setIsProcessing(true);

      // În producție ar redirecționa la PayPal API
      // window.location.href = `https://www.paypal.com/cgi-bin/webscr?...`;

      // Pentru dev, simulare după 2 secunde
      setTimeout(() => {
        // Update listing cu promovare
        const listing = memoryStorage.get(id);
        if (listing) {
          const updatedListing = {
            ...listing,
            promotionType: packageId,
            promotionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            isFeatured: true,
            paymentMethod: 'paypal',
            paymentDate: new Date().toISOString(),
            paymentTransactionId: `PP-${Date.now()}`
          };
          memoryStorage.set(id, updatedListing);
        }

        setShowSuccess(true);
        setIsProcessing(false);
      }, 2500);
    };

    simulatePayPalPayment();
  }, [id, packageId]);

  if (showSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-6xl">✅</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Plată PayPal Confirmată!</h1>
            <p className="text-gray-400 text-lg mb-8">Anunțul tău a fost promovat cu succes</p>
            <button
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

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#0070BA] rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.32 21.97a.546.546 0 01-.26-.32c-.03-.15-.01-.89.62-4.09.03-.16.06-.32.08-.47.18-.98.28-1.49.97-1.49h1.46c2.92 0 5.17-1.07 6.16-2.94.77-1.44.9-3.12.38-4.87-.03-.11-.07-.21-.11-.32.64.23 1.22.53 1.72.91 1.93 1.46 2.45 3.8 1.55 6.99-.98 3.45-3.82 5.6-7.25 5.6h-5.32z" />
              <path d="M11.85 6h-4.61c-.42 0-.79.31-.85.73l-1.88 12.06a.546.546 0 00.54.64h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.73.85-.73h1.97c4.07 0 6.42-2.01 7.03-5.99.29-1.82.01-3.25-.85-4.28C17.8 2.85 15.93 2 13.42 2h-4.61c-.42 0-.79.31-.85.73L6.08 9.68c-.06.42.24.77.66.77h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.54.48-.54z" />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-white mb-4">Redirecționare PayPal</h1>
          <p className="text-gray-300 text-lg mb-2">Se procesează plata de {price} RON...</p>
          <p className="text-gray-400 text-sm mb-8">Te redirecționez către PayPal pentru a completa plata</p>

          <div className="max-w-lg mx-auto mb-8 bg-gray-800/60 border border-gray-700 rounded-2xl p-4 text-sm text-gray-300">
            <div className="font-bold text-white mb-3">Detalii plată:</div>
            
            {/* Price breakdown */}
            {price && (
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
                {(() => {
                  const priceNumber = parseFloat(price);
                  const subtotal = Math.round((priceNumber * 100) / (100 + COMPANY_CONFIG.vatRate));
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
            )}

            <div className="space-y-1">
              <div><span className="text-gray-400">Beneficiar:</span> {COMPANY_CONFIG.name}</div>
              <div><span className="text-gray-400">CUI/TVA:</span> {COMPANY_CONFIG.cui}</div>
              <div><span className="text-gray-400">IBAN:</span> {COMPANY_CONFIG.iban}</div>
              <div><span className="text-gray-400">Banca:</span> {COMPANY_CONFIG.bank}</div>
              <div><span className="text-gray-400">Monedă:</span> {COMPANY_CONFIG.currency}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-3 h-3 bg-[#0070BA] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-[#0070BA] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-[#0070BA] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
          >
            ← Înapoi
          </button>
        </div>
      </main>
    </>
  );
}
