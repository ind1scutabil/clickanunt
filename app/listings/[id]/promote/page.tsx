'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

export default function PromotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const packages = [
    {
      id: 'top',
      name: 'TOP Anunț',
      icon: '🔝',
      color: 'from-yellow-500 to-orange-500',
      price: 49,
      duration: '7 zile',
      features: [
        '⭐ Poziționare în TOP 3',
        '🎯 Evidențiere cu fundal auriu',
        '📍 Badge "TOP Anunț"',
        '🚀 Vizibilitate 5x mai mare',
        '📊 Statistici avansate',
        '⚡ Refresh automat zilnic'
      ],
      description: 'Cel mai popular! Perfect pentru vânzări rapide'
    },
    {
      id: 'urgent',
      name: 'Anunț URGENT',
      icon: '🔥',
      color: 'from-red-500 to-pink-600',
      price: 29,
      duration: '3 zile',
      features: [
        '🔥 Badge "URGENT" roșu',
        '⚡ Poziționare prioritară',
        '🎨 Fundal evidențiat',
        '👁️ Vizibilitate crescută 3x',
        '📈 Statistici standard',
        '🔄 Un refresh manual'
      ],
      description: 'Ideal pentru anunțuri urgente'
    },
    {
      id: 'featured',
      name: 'Anunț Evidențiat',
      icon: '✨',
      color: 'from-purple-500 to-indigo-600',
      price: 19,
      duration: '5 zile',
      features: [
        '✨ Badge "Evidențiat"',
        '🎯 Afișare prioritară',
        '💎 Fundal premium',
        '👥 Vizibilitate 2x mai mare',
        '📊 Statistici de bază',
        '🔄 Refresh la 48h'
      ],
      description: 'Opțiunea optimă calitate/preț'
    },
    {
      id: 'refresh',
      name: 'Reîmprospătare',
      icon: '🔄',
      color: 'from-blue-500 to-cyan-500',
      price: 9,
      duration: 'Instant',
      features: [
        '🔄 Reîmprospătare instant',
        '📍 Urcat în listă',
        '⏰ Actualizare dată',
        '👁️ Vizibilitate îmbunătățită',
        '✅ Activare imediată',
        '💰 Cel mai accesibil'
      ],
      description: 'Perfect pentru actualizări rapide'
    }
  ];

  useEffect(() => {
    const loadListing = async () => {
      try {
        const response = await fetch(`/api/listings/${id}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setListing(data);
        } else {
          console.error('Failed to load listing:', response.statusText);
          setListing(null);
        }
      } catch (error) {
        console.error('Error loading listing:', error);
        setListing(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadListing();
    }
  }, [id]);

  const handlePromote = () => {
    if (!selectedPackage) {
      alert('Selectează un pachet de promovare!');
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) {
      alert('Selectează o metodă de plată!');
      return;
    }

    const pkg = packages.find(p => p.id === selectedPackage);

    // Redirecționare în funcție de metoda de plată
    if (selectedPaymentMethod === 'card') {
      router.push(`/listings/${id}/promote/payment/card?package=${selectedPackage}&price=${pkg?.price}`);
    } else if (selectedPaymentMethod === 'paypal') {
      // Simulare PayPal - în producție ar fi clientID și return URLs reale
      const returnUrl = encodeURIComponent(`${window.location.origin}/listings/${id}/promote/payment/success?package=${selectedPackage}`);
      const cancelUrl = encodeURIComponent(`${window.location.origin}/listings/${id}/promote`);
      // În producție: window.location.href = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=YOUR_PAYPAL_EMAIL&item_name=${pkg?.name}&amount=${pkg?.price}&currency_code=RON&return=${returnUrl}&cancel_return=${cancelUrl}`;
      // Pentru dev, mergem pe pagina de success direct
      router.push(`/listings/${id}/promote/payment/paypal?package=${selectedPackage}&price=${pkg?.price}`);
    } else if (selectedPaymentMethod === 'transfer') {
      router.push(`/listings/${id}/promote/payment/transfer?package=${selectedPackage}&price=${pkg?.price}`);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Se încarcă...</p>
          </div>
        </main>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Anunț negăsit</h1>
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
            <h1 className="text-4xl font-black text-white mb-4">Promovare Activată!</h1>
            <p className="text-gray-400 text-lg">Anunțul tău a fost promovat cu succes</p>
          </div>
        </main>
      </>
    );
  }

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <>
      <Navbar />
      
      {/* Payment Modal */}
      {showPaymentModal && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-3xl shadow-2xl border border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-800/80 hover:bg-red-500/20 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className={`relative p-8 bg-gradient-to-r ${selectedPkg.color} rounded-t-3xl`}>
              <div className="absolute inset-0 bg-black/20 rounded-t-3xl"></div>
              <div className="relative text-center">
                <div className="text-6xl mb-4">{selectedPkg.icon}</div>
                <h2 className="text-3xl font-black text-white mb-2">Confirmare Plată</h2>
                <p className="text-white/90 text-lg">{selectedPkg.name}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-8">
              {/* Price Summary */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-700/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400 text-lg">Pachet selectat:</span>
                  <span className="text-white font-bold text-lg">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400 text-lg">Durată:</span>
                  <span className="text-white font-bold text-lg">{selectedPkg.duration}</span>
                </div>
                <div className="border-t border-gray-700/50 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-2xl">Total de plată:</span>
                    <span className={`text-4xl font-black bg-gradient-to-r ${selectedPkg.color} bg-clip-text text-transparent`}>
                      {selectedPkg.price} RON
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  💳 Selectează metoda de plată
                </h3>
                <div className="space-y-3">
                  {/* Card Payment */}
                  <button
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`w-full p-5 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      selectedPaymentMethod === 'card'
                        ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 shadow-lg shadow-[#6D5BFF]/30'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-lg">Card Bancar</p>
                          <p className="text-gray-400 text-sm">Visa, Mastercard, American Express</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-8" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" className="h-8" />
                      </div>
                    </div>
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => setSelectedPaymentMethod('paypal')}
                    className={`w-full p-5 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      selectedPaymentMethod === 'paypal'
                        ? 'border-[#0070BA] bg-[#0070BA]/10 shadow-lg shadow-[#0070BA]/30'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0070BA] rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.32 21.97a.546.546 0 01-.26-.32c-.03-.15-.01-.89.62-4.09.03-.16.06-.32.08-.47.18-.98.28-1.49.97-1.49h1.46c2.92 0 5.17-1.07 6.16-2.94.77-1.44.9-3.12.38-4.87-.03-.11-.07-.21-.11-.32.64.23 1.22.53 1.72.91 1.93 1.46 2.45 3.8 1.55 6.99-.98 3.45-3.82 5.6-7.25 5.6h-5.32z" />
                            <path d="M11.85 6h-4.61c-.42 0-.79.31-.85.73l-1.88 12.06a.546.546 0 00.54.64h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.73.85-.73h1.97c4.07 0 6.42-2.01 7.03-5.99.29-1.82.01-3.25-.85-4.28C17.8 2.85 15.93 2 13.42 2h-4.61c-.42 0-.79.31-.85.73L6.08 9.68c-.06.42.24.77.66.77h3.29c.42 0 .79-.31.85-.73l.49-3.18c.06-.42.43-.54.48-.54z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-lg">PayPal</p>
                          <p className="text-gray-400 text-sm">Plată rapidă și securizată</p>
                        </div>
                      </div>
                      <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" className="h-8" />
                    </div>
                  </button>

                  {/* Transfer Bancar */}
                  <button
                    onClick={() => setSelectedPaymentMethod('transfer')}
                    className={`w-full p-5 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      selectedPaymentMethod === 'transfer'
                        ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/30'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-lg">Transfer Bancar</p>
                          <p className="text-gray-400 text-sm">Plată prin transfer bancar direct</p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-6 mb-6 py-4 bg-gray-800/30 rounded-xl">
                <div className="flex items-center gap-2 text-green-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm font-medium">Plată Securizată SSL</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm font-medium">Protecție Cumpărător</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-4 bg-gray-800 border-2 border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={!selectedPaymentMethod}
                  className={`flex-1 py-4 rounded-xl font-black text-lg transition-all transform ${
                    selectedPaymentMethod
                      ? `bg-gradient-to-r ${selectedPkg.color} text-white hover:scale-105 hover:shadow-2xl active:scale-95`
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedPaymentMethod ? '✓ Plătește Acum' : 'Selectează metoda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
              🚀 Promovează Anunțul
            </h1>
            <p className="text-gray-400 text-xl">Crește vizibilitatea și vinde mai repede!</p>
          </div>

          {/* Current Listing Preview */}
          <div className="mb-8 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-6">
            <h3 className="text-white font-bold text-lg mb-3">Anunțul tău:</h3>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-700 rounded-xl overflow-hidden">
                <img 
                  src={listing.photos?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop'} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-xl">{listing.title}</h4>
                <p className="text-2xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                  {listing.priceAmount?.toLocaleString()} {listing.priceCurrency}
                </p>
              </div>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  selectedPackage === pkg.id ? 'scale-105 ring-4 ring-white/50' : ''
                }`}
              >
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 h-full">
                  {/* Badge Popular */}
                  {pkg.id === 'top' && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg rotate-12">
                      🔥 CEL MAI POPULAR
                    </div>
                  )}
                  
                  {/* Gradient Border Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${pkg.color} opacity-20 blur-xl rounded-3xl`}></div>
                  
                  <div className="relative">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${pkg.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                        {pkg.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white">{pkg.name}</h3>
                        <p className="text-gray-400 text-sm">{pkg.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6 pb-6 border-b border-gray-700/50">
                      <div className="flex items-end gap-2">
                        <span className={`text-5xl font-black bg-gradient-to-r ${pkg.color} bg-clip-text text-transparent`}>
                          {pkg.price}
                        </span>
                        <span className="text-2xl text-gray-400 mb-2">RON</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">Valabil {pkg.duration}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <span className="text-green-400 text-sm mt-0.5">✓</span>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Select Button */}
                    <button
                      className={`w-full py-4 rounded-xl font-black text-lg transition-all transform ${
                        selectedPackage === pkg.id
                          ? `bg-gradient-to-r ${pkg.color} text-white shadow-xl`
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                      }`}
                    >
                      {selectedPackage === pkg.id ? '✅ SELECTAT' : 'SELECTEAZĂ'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex-1 py-4 bg-gray-800/80 border-2 border-gray-700/50 text-white rounded-xl font-bold hover:bg-gray-700/80 transition-all"
            >
              ← Înapoi
            </button>
            <button
              onClick={handlePromote}
              disabled={!selectedPackage}
              className="flex-1 py-4 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] text-white rounded-xl font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-[#6D5BFF]/50 transition-all transform hover:scale-105 active:scale-95"
            >
              🚀 PROMOVEAZĂ ACUM
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex items-center justify-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">🔒</span>
              <span>Plată securizată</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💳</span>
              <span>Card sau Transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚡</span>
              <span>Activare instantă</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
