'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
} from '@/lib/listing-photo-url';
import { applyUserPromotionDiscountToBaseBani } from '@/lib/promotion-pricing';

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
  const [userDiscount, setUserDiscount] = useState<number>(0);

  type PromoPkg = {
    id: string;
    name: string;
    icon: string;
    color: string;
    price: number;
    duration: string;
    features: string[];
    description: string;
    enabled: boolean;
  };

  const [packages, setPackages] = useState<PromoPkg[]>([
    {
      id: 'top',
      name: 'TOP Anunț',
      icon: '🔝',
      color: 'from-yellow-500 to-orange-500',
      price: 49,
      duration: '7 zile',
      enabled: true,
      features: [
        '⭐ Poziționare în TOP 3',
        '🎯 Evidențiere cu fundal auriu',
        '📍 Badge "TOP Anunț"',
        '🚀 Vizibilitate 5x mai mare',
        '📊 Statistici avansate',
        '⚡ Refresh automat zilnic',
      ],
      description: 'Cel mai popular! Perfect pentru vânzări rapide',
    },
    {
      id: 'urgent',
      name: 'Anunț URGENT',
      icon: '🔥',
      color: 'from-red-500 to-pink-600',
      price: 29,
      duration: '3 zile',
      enabled: true,
      features: [
        '🔥 Badge "URGENT" roșu',
        '⚡ Poziționare prioritară',
        '🎨 Fundal evidențiat',
        '👁️ Vizibilitate crescută 3x',
        '📈 Statistici standard',
        '🔄 Un refresh manual',
      ],
      description: 'Ideal pentru anunțuri urgente',
    },
    {
      id: 'featured',
      name: 'Anunț Evidențiat',
      icon: '✨',
      color: 'from-purple-500 to-indigo-600',
      price: 19,
      duration: '5 zile',
      enabled: true,
      features: [
        '✨ Badge "Evidențiat"',
        '🎯 Afișare prioritară',
        '💎 Fundal premium',
        '👥 Vizibilitate 2x mai mare',
        '📊 Statistici de bază',
        '🔄 Refresh la 48h',
      ],
      description: 'Opțiunea optimă calitate/preț',
    },
    {
      id: 'refresh',
      name: 'Reîmprospătare',
      icon: '🔄',
      color: 'from-blue-500 to-cyan-500',
      price: 9,
      duration: 'Instant',
      enabled: true,
      features: [
        '🔄 Reîmprospătare instant',
        '📍 Urcat în listă',
        '⏰ Actualizare dată',
        '👁️ Vizibilitate îmbunătățită',
        '✅ Activare imediată',
        '💰 Cel mai accesibil',
      ],
      description: 'Perfect pentru actualizări rapide',
    },
  ]);

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

  useEffect(() => {
    fetch('/api/promotion-packages', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('packages'))))
      .then(
        (data: {
          packages: Array<{
            id: string;
            name: string;
            priceRon: number;
            durationDays: number;
            enabled: boolean;
          }>;
        }) => {
          const byId = new Map(data.packages.map((p) => [p.id, p]));
          setPackages((prev) =>
            prev.map((def) => {
              const pub = byId.get(def.id);
              if (!pub) return def;
              return {
                ...def,
                name: pub.name,
                price: pub.priceRon,
                duration: pub.durationDays === 0 ? 'Instant' : `${pub.durationDays} zile`,
                enabled: pub.enabled,
              };
            })
          );
        }
      )
      .catch(() => {
        /* păstrăm valorile implicite */
      });
  }, []);

  useEffect(() => {
    if (!selectedPackage) return;
    const p = packages.find((x) => x.id === selectedPackage);
    if (p && !p.enabled) setSelectedPackage('');
  }, [packages, selectedPackage]);

  // Load user discount
  useEffect(() => {
    const loadUserDiscount = async () => {
      try {
        const response = await fetch('/api/user/discount');
        if (response.ok) {
          const data = await response.json();
          setUserDiscount(data.promotionDiscountPercent || 0);
        }
      } catch (error) {
        console.error('Error loading user discount:', error);
      }
    };

    loadUserDiscount();
  }, []);

  /** Același calcul ca la create-intent / verificare PayPal–transfer (bani). */
  const checkoutAmountBani = (basePriceRon: number) =>
    applyUserPromotionDiscountToBaseBani(Math.round(basePriceRon * 100), userDiscount);

  const handlePromote = () => {
    const st = String(listing?.status ?? '').toLowerCase();
    if (st !== 'active') {
      alert(
        'Anunțul este în așteptare. După aprobare și activare vei putea promova.'
      );
      return;
    }
    if (!selectedPackage) {
      alert('Selectează un pachet de promovare!');
      return;
    }
    const sel = packages.find((p) => p.id === selectedPackage);
    if (!sel?.enabled) {
      alert('Acest pachet nu este disponibil momentan.');
      return;
    }

    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) {
      alert('Selectează o metodă de plată!');
      return;
    }

    const pkg = packages.find((p) => p.id === selectedPackage);
    if (!pkg || !pkg.enabled) return;

    const amountBani = checkoutAmountBani(pkg.price);
    const priceParam = (amountBani / 100).toFixed(2);

    if (selectedPaymentMethod === 'card') {
      router.push(
        `/listings/${id}/promote/payment/card?package=${selectedPackage}&price=${priceParam}&amountBani=${amountBani}`
      );
      return;
    }

    alert(
      'Doar plata cu cardul (Stripe) activează promovarea automat. PayPal și transferul bancar nu sunt disponibile pentru activare automată.'
    );
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
  const listingIsActive = String(listing?.status ?? '').toLowerCase() === 'active';

  return (
    <>
      <Navbar />
      
      {/* Payment Modal */}
      {showPaymentModal && selectedPkg && (() => {
        const modalBaseBani = Math.round(selectedPkg.price * 100);
        const modalTotalBani = applyUserPromotionDiscountToBaseBani(modalBaseBani, userDiscount);
        const modalDiscountBani = Math.max(0, modalBaseBani - modalTotalBani);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-2xl border border-gray-700/50 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-800/80 hover:bg-red-500/20 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className={`relative p-5 bg-gradient-to-r ${selectedPkg.color} rounded-t-2xl`}>
              <div className="absolute inset-0 bg-black/20 rounded-t-2xl"></div>
              <div className="relative text-center">
                <div className="text-3xl mb-2">{selectedPkg.icon}</div>
                <h2 className="text-xl font-black text-white mb-1">Confirmare Plată</h2>
                <p className="text-white/90 text-sm">{selectedPkg.name}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Price Summary */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 mb-4 border border-gray-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Pachet selectat:</span>
                  <span className="text-white font-bold text-sm">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Durată:</span>
                  <span className="text-white font-bold text-sm">{selectedPkg.duration}</span>
                </div>
                <div className="border-t border-gray-700/50 pt-3 mt-3">
                  {modalDiscountBani > 0 && (
                    <>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-sm">Preț pachet:</span>
                        <span className="text-gray-400 line-through text-sm">
                          {(modalBaseBani / 100).toFixed(2)} RON
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-green-400 font-bold text-sm">🎉 Discount cont ({userDiscount}%):</span>
                        <span className="text-green-400 font-bold text-sm">
                          -{(modalDiscountBani / 100).toFixed(2)} RON
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-base">Total de plată:</span>
                    <span className={`text-2xl font-black bg-gradient-to-r ${selectedPkg.color} bg-clip-text text-transparent`}>
                      {(modalTotalBani / 100).toFixed(2)} RON
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-4">
                <h3 className="text-base font-black text-white mb-3 flex items-center gap-2">
                  💳 Selectează metoda de plată
                </h3>
                <div className="space-y-2">
                  {/* Card Payment */}
                  <button
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`w-full p-3 rounded-lg border-2 transition-all transform hover:scale-[1.01] ${
                      selectedPaymentMethod === 'card'
                        ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 shadow-lg shadow-[#6D5BFF]/30'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-sm">Card Bancar</p>
                          <p className="text-gray-400 text-xs">Visa, Mastercard, American Express</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" className="h-6" />
                      </div>
                    </div>
                  </button>

                  {/* PayPal — disabled: previously activated promotions without provider confirmation */}
                  <div
                    className="w-full p-3 rounded-lg border-2 border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-300 font-bold">PP</span>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-sm">PayPal</p>
                          <p className="text-amber-400/90 text-xs">
                            Indisponibil — promovarea se activează doar după plată Stripe confirmată
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transfer — disabled for the same reason */}
                  <div
                    className="w-full p-3 rounded-lg border-2 border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-300 font-bold">TB</span>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-bold text-sm">Transfer bancar</p>
                          <p className="text-amber-400/90 text-xs">
                            Indisponibil pentru activare automată — folosește cardul
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-1.5 text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-medium">Plată Securizată SSL</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-medium">Protecție Cumpărător</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 border-2 border-gray-700 text-white rounded-lg font-bold text-sm hover:bg-gray-700 transition-all"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={!selectedPaymentMethod}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all transform ${
                    selectedPaymentMethod
                      ? `bg-gradient-to-r ${selectedPkg.color} text-white hover:scale-[1.02] hover:shadow-xl active:scale-95`
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedPaymentMethod ? '✓ Plătește Acum' : 'Selectează metoda'}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {!listingIsActive && (
            <div
              className="mb-8 max-w-3xl mx-auto rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100"
              role="status"
            >
              Anunțul este în așteptare. După aprobare/activare vei putea promova.
            </div>
          )}
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
                  src={listingPrimaryPhotoSrc(listing.photos)} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.onerror = null;
                    el.src = LISTING_PHOTO_ONERROR_FALLBACK;
                  }}
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

          {/* Packages Grid - Enterprise Compact */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {packages
              .filter((pkg) => pkg.enabled)
              .map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => listingIsActive && setSelectedPackage(pkg.id)}
                className={`relative transition-all duration-300 transform ${
                  listingIsActive ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed opacity-60'
                } ${selectedPackage === pkg.id ? 'scale-[1.02] ring-2 ring-white/30' : ''}`}
              >
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 p-5 h-full">
                  {/* Badge Popular */}
                  {pkg.id === 'top' && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg rotate-6">
                      🔥 POPULAR
                    </div>
                  )}
                  
                  {/* Gradient Border Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${pkg.color} opacity-10 blur-lg rounded-2xl`}></div>
                  
                  <div className="relative">
                    {/* Icon & Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${pkg.color} rounded-xl flex items-center justify-center text-xl shadow-md flex-shrink-0`}>
                        {pkg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-white leading-tight">{pkg.name}</h3>
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{pkg.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-3 pb-3 border-b border-gray-700/50">
                      <div className="flex items-end gap-1">
                        <span className={`text-3xl font-black bg-gradient-to-r ${pkg.color} bg-clip-text text-transparent`}>
                          {pkg.price}
                        </span>
                        <span className="text-lg text-gray-400 mb-1">RON</span>
                      </div>
                      <p className="text-gray-500 text-xs">Valabil {pkg.duration}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-1.5 mb-4">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-gray-300">
                          <span className="text-green-400 text-[10px] mt-0.5 flex-shrink-0">✓</span>
                          <span className="text-xs leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Select Button */}
                    <button
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all ${
                        selectedPackage === pkg.id
                          ? `bg-gradient-to-r ${pkg.color} text-white shadow-lg`
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                      }`}
                    >
                      {selectedPackage === pkg.id ? '✓ Selectat' : 'Selectează'}
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
              disabled={!selectedPackage || !listingIsActive}
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
