'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { COMPANY_CONFIG } from '@/lib/company-config';

export default function CardPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const packageId = searchParams.get('package');
  const price = searchParams.get('price');

  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      // Format: XXXX XXXX XXXX XXXX
      const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      const matches = v.match(/\d{4,16}/g);
      const match = (matches && matches[0]) || '';
      const parts = [];
      for (let i = 0, len = match.length; i < len; i += 4) {
        parts.push(match.substring(i, i + 4));
      }
      setFormData({ ...formData, [name]: parts.join(' ') });
    } else if (name === 'cvv') {
      setFormData({ ...formData, [name]: value.replace(/[^0-9]/gi, '').substring(0, 3) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validare simplă
    if (!formData.cardNumber || !formData.cardName || !formData.expiryMonth || !formData.expiryYear || !formData.cvv || !formData.email) {
      alert('Completează toate câmpurile!');
      return;
    }

    if (formData.cardNumber.replace(/\s/g, '').length !== 16) {
      alert('Numărul cardului trebuie să aibă 16 cifre!');
      return;
    }

    if (formData.cvv.length !== 3) {
      alert('CVV trebuie să aibă 3 cifre!');
      return;
    }

    setLoading(true);

    // Simulare procesare plată (în producție ar merge la Stripe/PaymentProcessor)
    setTimeout(() => {
      // Update listing cu promovare
      const listing = memoryStorage.get(id);
      if (listing) {
        const updatedListing = {
          ...listing,
          promotionType: packageId,
          promotionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isFeatured: true,
          paymentMethod: 'card',
          paymentDate: new Date().toISOString(),
          paymentEmail: formData.email
        };
        memoryStorage.set(id, updatedListing);
      }

      setShowSuccess(true);
      setLoading(false);
    }, 2000);
  };

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
              onClick={() => router.push(`/listings/${id}`)}
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
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                💳 Plată cu Card Bancar
              </h1>
              <p className="text-gray-400">Introducă detaliile cardului tău pentru a completa plata</p>
            </div>

            {/* Price Summary */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
              {/* Price breakdown */}
              {price && (
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
              )}
              
              <div className="mt-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-300 space-y-1">
                <div className="font-bold text-white mb-2">Beneficiar plată:</div>
                <div><span className="text-gray-400">Companie:</span> {COMPANY_CONFIG.name}</div>
                <div><span className="text-gray-400">CUI/TVA:</span> {COMPANY_CONFIG.cui}</div>
                <div><span className="text-gray-400">IBAN:</span> {COMPANY_CONFIG.iban}</div>
                <div><span className="text-gray-400">Banca:</span> {COMPANY_CONFIG.bank}</div>
                <div><span className="text-gray-400">Monedă:</span> {COMPANY_CONFIG.currency}</div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Number */}
              <div>
                <label className="block text-white font-bold mb-3">Numărul Cardului</label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  maxLength={19}
                  className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg tracking-widest"
                />
              </div>

              {/* Card Name */}
              <div>
                <label className="block text-white font-bold mb-3">Titular Card</label>
                <input
                  type="text"
                  name="cardName"
                  placeholder="ION POPESCU"
                  value={formData.cardName}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                />
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-white font-bold mb-3">Lună</label>
                  <select
                    name="expiryMonth"
                    value={formData.expiryMonth}
                    onChange={handleChange}
                    className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-bold mb-3">Anul</label>
                  <select
                    name="expiryYear"
                    value={formData.expiryYear}
                    onChange={handleChange}
                    className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">YY</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year.toString().slice(-2)}>
                          {year.toString().slice(-2)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-bold mb-3">CVV</label>
                  <input
                    type="text"
                    name="cvv"
                    placeholder="123"
                    value={formData.cvv}
                    onChange={handleChange}
                    maxLength={3}
                    className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center text-lg tracking-widest"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-white font-bold mb-3">Email pentru Confirmare</label>
                <input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Security Notice */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-400 text-sm">Plata ta este protejată cu criptare SSL 256-bit</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 py-4 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                >
                  ← Înapoi
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-black text-lg disabled:opacity-50 hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 active:scale-95"
                >
                  {loading ? '⏳ Procesare...' : '✓ Plătește ' + price + ' RON'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
