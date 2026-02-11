"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { useState } from "react";
import { ALL_CATEGORIES } from "@/lib/carData";
import { 
  generateOrganizationStructuredData, 
  generateLocalBusinessStructuredData,
} from "@/lib/seo";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  
  // Don't auto-redirect - let users stay on homepage
  // They can navigate to dashboard/admin from navbar
  useEffect(() => {
    // Optional: could implement selective redirect logic here
    // But for now, homepage is public to all users
  }, []);
  
  // SEO structured data
  const structuredData = [
    generateOrganizationStructuredData(),
    generateLocalBusinessStructuredData(),
  ];

  const categoryData: { [key: string]: { icon: string; color: string; count: string } } = {
    "Auto, moto și ambarcațiuni": { icon: "🚗", color: "from-blue-500 to-blue-700", count: "15.234" },
    "Imobiliare": { icon: "🏠", color: "from-green-500 to-green-700", count: "12.456" },
    "Electronice și electrocasnice": { icon: "💻", color: "from-purple-500 to-purple-700", count: "8.932" },
    "Modă și frumusețe": { icon: "👗", color: "from-pink-500 to-pink-700", count: "6.543" },
    "Casă și grădină": { icon: "🛋️", color: "from-amber-500 to-amber-700", count: "4.321" },
    "Sport, timp liber și artă": { icon: "⚽", color: "from-red-500 to-red-700", count: "3.876" },
    "Copii și bebeluși": { icon: "🧸", color: "from-yellow-400 to-yellow-600", count: "2.987" },
    "Animale de companie": { icon: "🐾", color: "from-orange-500 to-orange-700", count: "1.654" },
    "Locuri de muncă": { icon: "💼", color: "from-slate-500 to-slate-700", count: "5.432" },
    "Servicii și afaceri": { icon: "🔧", color: "from-cyan-500 to-cyan-700", count: "3.210" },
    "Agricultură": { icon: "🌾", color: "from-lime-500 to-lime-700", count: "987" },
    "Altele": { icon: "📦", color: "from-gray-500 to-gray-700", count: "1.234" }
  };

  const categoryImages: { [key: string]: string } = {
    "Auto, moto și ambarcațiuni": "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&h=900&fit=crop",
    "Imobiliare": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=900&fit=crop",
    "Electronice și electrocasnice": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=900&fit=crop",
    "Modă și frumusețe": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=900&fit=crop",
    "Casă și grădină": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200&h=900&fit=crop",
    "Sport, timp liber și artă": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=900&fit=crop",
    "Copii și bebeluși": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200&h=900&fit=crop",
    "Animale de companie": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=900&fit=crop",
    "Locuri de muncă": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=900&fit=crop",
    "Servicii și afaceri": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&h=900&fit=crop",
    "Agricultură": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=900&fit=crop",
    "Altele": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&h=900&fit=crop"
  };

  const popularCategories = new Set([
    "Auto, moto și ambarcațiuni",
    "Imobiliare",
    "Electronice și electrocasnice",
    "Modă și frumusețe",
    "Casă și grădină",
    "Locuri de muncă"
  ]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedCategory) params.append('category', selectedCategory);
    window.location.href = `/listings?${params.toString()}`;
  };

  return (
    <>
      {/* Inject SEO structured data */}
      {structuredData.map((data, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data, null, 0),
          }}
        />
      ))}
      
      <main className="min-h-screen bg-[#0A0A0A]">
        <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        {/* Enterprise Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#6D5BFF]/25 via-transparent to-transparent" />
          <div className="absolute -top-24 right-0 w-[480px] h-[480px] bg-[#00D4FF]/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-32 left-0 w-[520px] h-[520px] bg-[#6D5BFF]/10 blur-[140px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:80px_80px] opacity-20" />
        </div>
        
        <div className="relative max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-gray-200 mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.9)]" />
              Platformă enterprise pentru anunțuri verificate
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white">
              Găsește rapid
              {" "}
              <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                oportunitățile potrivite
              </span>
              <br />
              <span className="text-gray-300">în toată România, cu încredere</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Peste <span className="text-[#6D5BFF] font-semibold">50.000</span> anunțuri verificate, filtre inteligente și protecție anti-fraudă.
            </p>
          </div>
          
          {/* Search Box */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#F5F7FF] rounded-2xl p-3 border border-[#DDE3FF] shadow-2xl hover:border-[#6D5BFF]/50 transition-all">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4E3CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Caută mașini, apartamente, telefoane..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#F8FAFF] border border-[#DDE3FF] focus:border-[#6D5BFF] focus:bg-white transition-all outline-none text-[#0B1220] placeholder-gray-500"
                  />
                </div>
                
                {/* Category Select */}
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-6 py-4 rounded-xl bg-[#F8FAFF] border border-[#DDE3FF] focus:border-[#6D5BFF] focus:bg-white transition-all outline-none text-[#0B1220] cursor-pointer"
                >
                  <option value="">Toate categoriile</option>
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  className="px-8 py-4 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:from-[#4E3CFF] hover:to-[#6D5BFF] rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-[0_20px_50px_rgba(109,91,255,0.35)]"
                >
                  CAUTĂ
                </button>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-300">
              <div className="glass-dark px-4 py-2 rounded-full border border-white/10">✔️ Anunțuri verificate</div>
              <div className="glass-dark px-4 py-2 rounded-full border border-white/10">🔒 Protecție anti-fraudă</div>
              <div className="glass-dark px-4 py-2 rounded-full border border-white/10">⚡ Răspuns rapid</div>
              <div className="glass-dark px-4 py-2 rounded-full border border-white/10">⭐ Suport dedicat</div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link 
                href="/listings/new"
                className="px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adaugă Anunț
              </Link>
              <Link 
                href="/auth/login"
                className="px-6 py-3 bg-[#1F2937] hover:bg-[#111827] text-white rounded-lg font-semibold transition-all border border-white/10"
              >
                Conectează-te
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-5 text-white">
            Toate{" "}
            <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
              categoriile
            </span>
          </h2>
          <p className="text-gray-400 text-xl">Descoperă mii de anunțuri în 12 categorii diverse</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ALL_CATEGORIES.map((categoryName) => {
            const data = categoryData[categoryName] || { icon: "📦", color: "from-gray-500 to-gray-700", count: "0" };
            const image = categoryImages[categoryName] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&h=900&fit=crop";
            
            return (
              <Link
                key={categoryName}
                href={`/listings?category=${encodeURIComponent(categoryName)}`}
                className="category-card card-3d group relative h-64 sm:h-72 overflow-hidden rounded-2xl border border-[#2A2A2A] transition-all duration-500"
              >
                {/* Background Image */}
                <img
                  src={image}
                  alt={categoryName}
                  className="category-card__image absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                <div className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                <div className="category-card__shine" />
                
                {/* Content */}
                <div className="relative h-full p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="category-icon-badge">
                      <span className="text-2xl">{data.icon}</span>
                    </div>
                    {popularCategories.has(categoryName) && (
                      <span className="category-popular-badge">POPULAR</span>
                    )}
                  </div>

                  <div className="mt-14">
                    <div className="glass-dark inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/10">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#6D5BFF] shadow-[0_0_12px_rgba(109,91,255,0.8)]" />
                      {data.count} anunțuri
                    </div>

                    <h3 className="mt-4 text-xl font-black text-white group-hover:text-[#00D4FF] transition-colors">
                      {categoryName}
                    </h3>

                    <div className="mt-3 flex items-center gap-3 text-sm text-gray-200">
                      <span className="opacity-80">Vezi anunțuri</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 group-hover:bg-[#6D5BFF]/20 transition">
                        <svg className="w-4 h-4 text-[#00D4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="relative bg-gradient-to-br from-[#6D5BFF]/10 via-[#00D4FF]/5 to-transparent rounded-3xl p-8 md:p-12 border border-[#6D5BFF]/20 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#6D5BFF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00D4FF]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="transform hover:scale-105 transition-transform">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">50K+</div>
              <div className="text-sm md:text-base text-gray-400">Anunțuri Active</div>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">100K+</div>
              <div className="text-sm md:text-base text-gray-400">Utilizatori</div>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">1M+</div>
              <div className="text-sm md:text-base text-gray-400">Vizitatori/lună</div>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent mb-2">4.8★</div>
              <div className="text-sm md:text-base text-gray-400">Rating Mediu</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            De ce{" "}
            <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
              ClickAnunț?
            </span>
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 hover:border-[#6D5BFF]/50 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-3">Rapid și Ușor</h3>
            <p className="text-gray-400">Publică un anunț în doar 2 minute. Interfață simplă și intuitivă.</p>
          </div>
          
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 hover:border-[#6D5BFF]/50 transition-all">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-white mb-3">Sigur și Verificat</h3>
            <p className="text-gray-400">Toate anunțurile sunt moderate. Protejăm datele tale personale.</p>
          </div>
          
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 hover:border-[#6D5BFF]/50 transition-all">
            <div className="text-4xl mb-4">💯</div>
            <h3 className="text-xl font-bold text-white mb-3">100% Gratuit</h3>
            <p className="text-gray-400">Fără costuri ascunse. Publică nelimitat, fără abonament.</p>
          </div>
        </div>
      </section>

      <Footer />
      </main>
    </>
  );
}
