'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

type StoredUser = {
  email?: string;
  role?: string;
};

const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export default function AdminPromotionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('packages');
  const storedUser = getStoredUser();
  const isAdmin =
    !!storedUser && (storedUser.email === 'owner@autoplatform.ro' || storedUser.role === 'admin');
  
  // Pachetele de promovare
  const [packages, setPackages] = useState([
    { id: 'top', name: 'TOP Anunț', price: 49, duration: 7, enabled: true, discount: 0 },
    { id: 'urgent', name: 'Anunț URGENT', price: 29, duration: 3, enabled: true, discount: 0 },
    { id: 'featured', name: 'Anunț Evidențiat', price: 19, duration: 5, enabled: true, discount: 0 },
    { id: 'refresh', name: 'Reîmprospătare', price: 9, duration: 0, enabled: true, discount: 0 }
  ]);

  // Promoții active
  const [promotions, setPromotions] = useState([
    { id: 1, code: 'PRIMA10', type: 'percent', value: 10, enabled: true, usageCount: 45 },
    { id: 2, code: 'TOP50', type: 'fixed', value: 50, packageId: 'top', enabled: true, usageCount: 12 },
    { id: 3, code: 'GRATUIT', type: 'free', value: 100, packageId: 'refresh', enabled: true, usageCount: 234 }
  ]);

  // Statistici
  const stats = {
    totalRevenue: 15478,
    totalPromotions: 342,
    activePromotions: 87,
    topPackageCount: 145,
    urgentPackageCount: 98,
    featuredPackageCount: 76,
    refreshCount: 23
  };

  useEffect(() => {
    if (!storedUser) {
      alert('🔒 Trebuie să fii autentificat ca administrator pentru a accesa această pagină.');
      router.push('/auth/login');
      return;
    }

    if (!isAdmin) {
      alert('⛔ Acces interzis! Această secțiune este rezervată doar administratorilor.');
      router.push('/dashboard');
    }
  }, [router, storedUser, isAdmin]);

  const updatePackagePrice = (id: string, newPrice: number) => {
    setPackages(packages.map(pkg => 
      pkg.id === id ? { ...pkg, price: newPrice } : pkg
    ));
  };

  const updatePackageDiscount = (id: string, discount: number) => {
    setPackages(packages.map(pkg => 
      pkg.id === id ? { ...pkg, discount } : pkg
    ));
  };

  const togglePackage = (id: string) => {
    setPackages(packages.map(pkg => 
      pkg.id === id ? { ...pkg, enabled: !pkg.enabled } : pkg
    ));
  };

  const addPromotion = () => {
    const code = prompt('Cod promoțional:');
    if (!code) return;
    
    const type = prompt('Tip (percent/fixed/free):');
    if (!type) return;
    
    const value = parseInt(prompt('Valoare:') || '0');
    
    setPromotions([
      ...promotions,
      { 
        id: Date.now(), 
        code: code.toUpperCase(), 
        type: type as 'percent' | 'fixed' | 'free',
        value, 
        enabled: true, 
        usageCount: 0 
      }
    ]);
  };

  const togglePromotion = (id: number) => {
    setPromotions(promotions.map(promo => 
      promo.id === id ? { ...promo, enabled: !promo.enabled } : promo
    ));
  };

  const deletePromotion = (id: number) => {
    if (confirm('Ștergi această promoție?')) {
      setPromotions(promotions.filter(promo => promo.id !== id));
    }
  };

  if (!storedUser || !isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
                💎 Admin - Promoții
              </h1>
              <p className="text-gray-400 text-lg">Gestionează pachete de promovare și coduri discount</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#4E3CFF] hover:to-[#6D5BFF] text-white rounded-lg transition-all shadow-lg hover:shadow-[#6D5BFF]/50 font-semibold whitespace-nowrap"
            >
              ← Înapoi la Dashboard
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
              <div className="text-4xl mb-2">💰</div>
              <div className="text-3xl font-black text-white">{stats.totalRevenue.toLocaleString()} RON</div>
              <div className="text-green-400 text-sm">Venit Total</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
              <div className="text-4xl mb-2">🚀</div>
              <div className="text-3xl font-black text-white">{stats.totalPromotions}</div>
              <div className="text-blue-400 text-sm">Total Promovări</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
              <div className="text-4xl mb-2">⚡</div>
              <div className="text-3xl font-black text-white">{stats.activePromotions}</div>
              <div className="text-purple-400 text-sm">Active Acum</div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30">
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-3xl font-black text-white">{stats.topPackageCount}</div>
              <div className="text-yellow-400 text-sm">Pachete TOP</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'packages'
                  ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              📦 Pachete
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'codes'
                  ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              🎟️ Coduri Promoționale
            </button>
          </div>

          {/* Pachete Tab */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-white">Pachete de Promovare</h2>
              </div>

              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-white">{pkg.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          pkg.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {pkg.enabled ? '✓ Activ' : '✗ Dezactivat'}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Preț (RON)</label>
                          <input
                            type="number"
                            value={pkg.price}
                            onChange={(e) => updatePackagePrice(pkg.id, parseInt(e.target.value))}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Discount (%)</label>
                          <input
                            type="number"
                            value={pkg.discount}
                            onChange={(e) => updatePackageDiscount(pkg.id, parseInt(e.target.value))}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Durată (zile)</label>
                          <input
                            type="number"
                            value={pkg.duration}
                            disabled
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500"
                          />
                        </div>
                      </div>

                      {pkg.discount > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-gray-400 line-through">{pkg.price} RON</span>
                          <span className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                            {Math.round(pkg.price * (1 - pkg.discount / 100))} RON
                          </span>
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                            -{pkg.discount}%
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => togglePackage(pkg.id)}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        pkg.enabled
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {pkg.enabled ? '🚫 Dezactivează' : '✅ Activează'}
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => alert('Salvat cu succes!')}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all"
              >
                💾 SALVEAZĂ MODIFICĂRILE
              </button>
            </div>
          )}

          {/* Coduri Promoționale Tab */}
          {activeTab === 'codes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-white">Coduri Promoționale</h2>
                <button
                  onClick={addPromotion}
                  className="px-6 py-3 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-xl font-bold hover:shadow-xl transition-all"
                >
                  ➕ Adaugă Cod
                </button>
              </div>

              {promotions.map(promo => (
                <div
                  key={promo.id}
                  className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="px-4 py-2 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-lg font-black text-xl">
                          {promo.code}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          promo.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {promo.enabled ? '✓ Activ' : '✗ Dezactivat'}
                        </span>
                        {promo.type === 'percent' && (
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold">
                            -{promo.value}%
                          </span>
                        )}
                        {promo.type === 'fixed' && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold">
                            -{promo.value} RON
                          </span>
                        )}
                        {promo.type === 'free' && (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold">
                            🎁 GRATUIT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-gray-400 text-sm">
                        <span>📊 Utilizări: <span className="text-white font-bold">{promo.usageCount}</span></span>
                        {promo.packageId && (
                          <span>📦 Pachet: <span className="text-white font-bold">{promo.packageId.toUpperCase()}</span></span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePromotion(promo.id)}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${
                          promo.enabled
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {promo.enabled ? '⏸️ Pauză' : '▶️ Activează'}
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                      >
                        🗑️ Șterge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
