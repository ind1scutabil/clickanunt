'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subcategory: '',
    priceAmount: 0,
    priceCurrency: 'RON',
    condition: '',
    description: '',
    county: '',
    city: '',
    contactPhone: '',
    make: '',
    model: '',
    year: 0,
    mileage: 0,
    fuel: '',
    transmission: ''
  });

  useEffect(() => {
    const loadListing = () => {
      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';
      
      if (useInMemory) {
        const data = memoryStorage.get(id);
        if (data) {
          setListing(data);
          setFormData({
            title: data.title || '',
            category: data.category || '',
            subcategory: data.subcategory || '',
            priceAmount: data.priceAmount || 0,
            priceCurrency: data.priceCurrency || 'RON',
            condition: data.condition || '',
            description: data.description || '',
            county: data.county || '',
            city: data.city || '',
            contactPhone: data.contactPhone || '',
            make: data.make || '',
            model: data.model || '',
            year: data.year || 0,
            mileage: data.mileage || 0,
            fuel: data.fuel || '',
            transmission: data.transmission || ''
          });
        }
      }
      setLoading(false);
    };

    if (id) {
      loadListing();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';
      
      if (useInMemory) {
        // Update in memory storage
        const updatedListing = {
          ...listing,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        memoryStorage.set(id, updatedListing);
        console.log('✅ Updated listing in memory:', id);
        alert('Anunț actualizat cu succes!');
        router.push(`/listings/${id}`);
      } else {
        // Production: call API
        const response = await fetch(`/api/listings/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to update');
        }

        alert('Anunț actualizat cu succes!');
        router.push(`/listings/${id}`);
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Eroare la actualizare');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Se încarcă...</p>
          </div>
        </main>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Anunț negăsit</h1>
            <button 
              onClick={() => router.push('/dashboard/listings')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Înapoi la anunțuri
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
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header with gradient */}
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
              Editează Anunțul
            </h1>
            <p className="text-gray-400 text-lg">Modifică și îmbunătățește detaliile anunțului tău</p>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6D5BFF]/10 to-[#00D4FF]/10 rounded-3xl blur-3xl"></div>
            
            <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 space-y-6">
              {/* Animated border gradient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] opacity-20 blur-xl"></div>
              {/* Title */}
              <div className="relative">
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] rounded-lg flex items-center justify-center text-white text-xs">
                    1
                  </span>
                  Titlu anunț *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#6D5BFF] focus:ring-4 focus:ring-[#6D5BFF]/20 transition-all duration-300 shadow-lg hover:shadow-[#6D5BFF]/20"
                  placeholder="Ex: BMW Seria 7 - Stare impecabilă"
                  required
                />
              </div>

              {/* Price Section with 3D effect */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#00A8CC] rounded-lg flex items-center justify-center text-white text-xs">
                    💰
                  </span>
                  Preț și Monedă
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Preț *
                    </label>
                    <input
                      type="number"
                      value={formData.priceAmount}
                      onChange={(e) => setFormData({ ...formData, priceAmount: parseInt(e.target.value) })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#00D4FF] focus:ring-4 focus:ring-[#00D4FF]/20 transition-all duration-300"
                      placeholder="70000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Monedă
                    </label>
                    <select
                      value={formData.priceCurrency}
                      onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#00D4FF] focus:ring-4 focus:ring-[#00D4FF]/20 transition-all duration-300 appearance-none cursor-pointer"
                    >
                      <option value="RON">RON (Lei)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="USD">USD (Dolari)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Condition & Location Section */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Stare
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#6D5BFF] focus:ring-4 focus:ring-[#6D5BFF]/20 transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="">Selectează...</option>
                    <option value="Nou">✨ Nou</option>
                    <option value="Folosit">🔄 Folosit</option>
                    <option value="Recondiționat">🔧 Recondiționat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Județ
                  </label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#6D5BFF] focus:ring-4 focus:ring-[#6D5BFF]/20 transition-all duration-300"
                    placeholder="București"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Oraș
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#6D5BFF] focus:ring-4 focus:ring-[#6D5BFF]/20 transition-all duration-300"
                    placeholder="Sector 1"
                  />
                </div>
              </div>

              {/* Auto fields with premium styling */}
              {formData.category === "Auto, moto și ambarcațiuni" && (
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-2xl p-6 border border-gray-700/30 shadow-xl space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-br from-[#4E3CFF] to-[#6D5BFF] rounded-lg flex items-center justify-center text-white text-xs">
                      🚗
                    </span>
                    Detalii Vehicul
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Marcă
                      </label>
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="BMW, Mercedes, Audi..."
                      />
                    </div>
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="Seria 7, E-Class, A6..."
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        An fabricație
                      </label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="2020"
                      />
                    </div>
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Kilometraj
                      </label>
                      <input
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="50000 km"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Combustibil
                      </label>
                      <input
                        type="text"
                        value={formData.fuel}
                        onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="Diesel, Benzină, Electric..."
                      />
                    </div>
                    <div className="relative group">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Transmisie
                      </label>
                      <input
                        type="text"
                        value={formData.transmission}
                        onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-300 group-hover:border-gray-600"
                        placeholder="Automatic, Manual..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description with gradient border */}
              <div className="relative">
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#00A8CC] rounded-lg flex items-center justify-center text-white text-xs">
                    📝
                  </span>
                  Descriere detaliată
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#00D4FF] focus:ring-4 focus:ring-[#00D4FF]/20 transition-all duration-300 shadow-lg resize-none"
                  placeholder="Descrie anunțul tău în detaliu... Menționează starea, dotările, istoricul, etc."
                />
              </div>

              {/* Contact Phone with icon */}
              <div className="relative">
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-[#4E3CFF] to-[#6D5BFF] rounded-lg flex items-center justify-center text-white text-xs">
                    📞
                  </span>
                  Telefon contact
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#6D5BFF] focus:ring-4 focus:ring-[#6D5BFF]/20 transition-all duration-300 shadow-lg"
                  placeholder="+40 XXX XXX XXX"
                />
              </div>

              {/* Action Buttons with 3D effect */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 relative group overflow-hidden bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] text-white py-4 rounded-xl font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-[#6D5BFF]/50 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {saving ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Se salvează...
                      </>
                    ) : (
                      <>
                        ✨ Salvează Modificările
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/listings/${id}`)}
                  className="px-8 py-4 bg-gray-800/80 hover:bg-gray-700/80 border-2 border-gray-700/50 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  ✖️ Anulează
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
