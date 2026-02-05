import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { CATEGORIES, ALL_CATEGORIES } from "@/lib/carData";

export default function HomePage() {
  const categoryData: { [key: string]: { icon: string; color: string; image: string } } = {
    "Auto, moto și ambarcațiuni": { 
      icon: "🚗", 
      color: "from-blue-500 to-blue-700",
      image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop"
    },
    "Imobiliare": { 
      icon: "🏠", 
      color: "from-green-500 to-green-700",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop"
    },
    "Electronice și electrocasnice": { 
      icon: "💻", 
      color: "from-purple-500 to-purple-700",
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop"
    },
    "Modă și frumusețe": { 
      icon: "👗", 
      color: "from-pink-500 to-pink-700",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
    },
    "Casă și grădină": { 
      icon: "🛋️", 
      color: "from-amber-500 to-amber-700",
      image: "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=400&h=300&fit=crop"
    },
    "Sport, timp liber și artă": { 
      icon: "⚽", 
      color: "from-red-500 to-red-700",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop"
    },
    "Copii și bebeluși": { 
      icon: "🧸", 
      color: "from-yellow-400 to-yellow-600",
      image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop"
    },
    "Animale de companie": { 
      icon: "🐾", 
      color: "from-orange-500 to-orange-700",
      image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=300&fit=crop"
    },
    "Locuri de muncă": { 
      icon: "💼", 
      color: "from-slate-500 to-slate-700",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop"
    },
    "Servicii și afaceri": { 
      icon: "🔧", 
      color: "from-cyan-500 to-cyan-700",
      image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&h=300&fit=crop"
    },
    "Agricultură": { 
      icon: "🌾", 
      color: "from-lime-500 to-lime-700",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop"
    },
    "Altele": { 
      icon: "📦", 
      color: "from-gray-500 to-gray-700",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=300&fit=crop"
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0A0A0A] to-black">
      <Navbar />

      {/* Hero Section - Dark Theme with 3D Effects */}
      <section className="relative overflow-hidden pt-24 pb-16 mt-16">
        {/* Animated 3D Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-[#FF7900]/30 to-[#E66D00]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-[#1E90FF]/30 to-[#4DA6FF]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#B537F2]/20 to-[#7B2BF9]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,121,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,121,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_60%,transparent_100%)]"></div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
              <span className="block mb-3 neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] via-[#FF8F1F] to-[#FFB84D]">
                Găsește exact ce cauți
              </span>
              <span className="block text-white drop-shadow-2xl">în toată România</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light">
              Peste <span className="text-[#FF7900] font-bold">50.000</span> de anunțuri verificate · Toate categoriile · Zero comisioane
            </p>
          </div>
          
          {/* 3D Search Bar with Glow Effect */}
          <div className="max-w-5xl mx-auto animate-slide-in-up">
            <div className="glass-dark rounded-2xl shadow-2xl p-3 border-2 border-[#FF7900]/30 relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF7900]/20 via-[#1E90FF]/20 to-[#B537F2]/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
              <div className="relative flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#FF7900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Ce cauți? (BMW, iPhone, apartament...)"
                    className="w-full pl-14 pr-6 py-5 rounded-xl bg-black/50 border-2 border-[#2A2A2A] focus:border-[#FF7900] focus:bg-black transition-all outline-none text-white text-lg font-medium placeholder-gray-500"
                  />
                </div>
                <select className="px-6 py-5 rounded-xl bg-black/50 border-2 border-[#2A2A2A] focus:border-[#FF7900] transition-all outline-none text-white text-lg font-semibold cursor-pointer">
                  <option value="">🏷️ Toate categoriile</option>
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Link 
                  href="/listings"
                  className="mobile-orange-btn text-lg whitespace-nowrap text-center flex items-center justify-center gap-3 min-w-[180px] relative overflow-hidden group/btn shadow-[0_0_30px_rgba(255,121,0,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-[#FFB84D] via-[#FF7900] to-[#E66D00] opacity-0 group-hover/btn:opacity-100 transition-opacity"></span>
                  <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="font-black relative z-10">CAUTĂ</span>
                </Link>
              </div>
            </div>
            
            {/* Stats Cards with 3D Effect */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="card-3d glass-dark rounded-2xl p-6 text-center border border-[#FF7900]/20 hover:border-[#FF7900]/50 transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-xl mb-3 shadow-lg">
                  <span className="text-3xl">📊</span>
                </div>
                <div className="text-4xl font-black text-[#FF7900] mb-1">50.000+</div>
                <div className="text-sm text-gray-400 font-medium">Anunțuri verificate</div>
              </div>
              <div className="card-3d glass-dark rounded-2xl p-6 text-center border border-[#1E90FF]/20 hover:border-[#1E90FF]/50 transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-xl mb-3 shadow-lg">
                  <span className="text-3xl">👥</span>
                </div>
                <div className="text-4xl font-black text-[#1E90FF] mb-1">100.000+</div>
                <div className="text-sm text-gray-400 font-medium">Utilizatori activi</div>
              </div>
              <div className="card-3d glass-dark rounded-2xl p-6 text-center border border-[#B537F2]/20 hover:border-[#B537F2]/50 transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#B537F2] to-[#7B2BF9] rounded-xl mb-3 shadow-lg">
                  <span className="text-3xl">⚡</span>
                </div>
                <div className="text-4xl font-black text-[#B537F2] mb-1">1M+</div>
                <div className="text-sm text-gray-400 font-medium">Vizualizări lunar</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid - Dark Theme with 3D Cards and Vibrant Images */}
      <section className="max-w-7xl mx-auto px-4 py-20 relative">
        {/* Section Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none"></div>
        
        <div className="text-center mb-16 relative">
          <h2 className="text-5xl md:text-6xl font-black mb-5">
            <span className="text-white">Toate </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">categoriile</span>
          </h2>
          <p className="text-gray-400 text-xl font-medium">Descoperă mii de anunțuri în 12 categorii diverse</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative">
          {ALL_CATEGORIES.map((categoryName, index) => {
            const data = categoryData[categoryName] || { icon: "📦", color: "from-gray-500 to-gray-700", image: "" };
            return (
              <Link
                key={categoryName}
                href={`/listings?category=${encodeURIComponent(categoryName)}`}
                className="card-3d group relative overflow-hidden rounded-2xl border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all duration-500"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Vibrant Image Background */}
                <div className="relative h-56 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url(${data.image})` }}
                  />
                  {/* Colorful Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-70 group-hover:opacity-50 transition-all duration-500 mix-blend-multiply`} />
                  
                  {/* Neon Glow Effect on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF7900]/30 via-transparent to-[#1E90FF]/30"></div>
                  
                  {/* Animated Badge */}
                  <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-[#FF7900] to-[#E66D00] text-white text-xs font-black rounded-full shadow-lg shadow-[#FF7900]/50 animate-pulse">
                    POPULAR
                  </div>
                  
                  {/* 3D Icon with Glass Effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="glass-dark rounded-2xl p-5 shadow-2xl transform group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-500 border border-white/10">
                      <span className="text-5xl drop-shadow-2xl">{data.icon}</span>
                    </div>
                  </div>
                </div>
                
                {/* Content with Glass Effect */}
                <div className="glass-dark p-5 border-t border-[#2A2A2A]">
                  <h3 className="font-black text-lg text-white mb-2 group-hover:text-[#FF7900] transition-colors">
                    {categoryName}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="font-semibold">Vezi anunțuri</span>
                    <svg className="w-5 h-5 text-[#FF7900] transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* 3D Shadow Effect */}
                <div className="absolute inset-0 rounded-2xl shadow-[0_20px_60px_rgba(255,121,0,0)] group-hover:shadow-[0_20px_60px_rgba(255,121,0,0.4)] transition-shadow duration-500 pointer-events-none"></div>
              </Link>
            );
          })}
        </div>

        {/* CTA Button with Neon Effect */}
        <div className="text-center mt-16 relative">
          <Link href="/listings" className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-[#FF7900] via-[#FF8F1F] to-[#FF7900] text-white text-xl font-black rounded-2xl shadow-[0_0_40px_rgba(255,121,0,0.6)] hover:shadow-[0_0_60px_rgba(255,121,0,0.9)] transform hover:scale-105 transition-all duration-300 border-2 border-[#FFB84D]">
            <span>Explorează toate anunțurile</span>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Featured/Promoted Listings - Dark Theme with 3D Cards */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0A0A0A] to-black"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF7900] to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="text-5xl md:text-6xl font-black mb-3">
                <span className="text-white">⭐ Anunțuri </span>
                <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">recomandate</span>
              </h2>
              <p className="text-gray-400 text-lg font-medium">Cele mai bune oferte selectate special pentru tine</p>
            </div>
            <Link 
              href="/listings" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#1E90FF] to-[#4DA6FF] text-white font-black rounded-xl shadow-[0_0_30px_rgba(30,144,255,0.5)] hover:shadow-[0_0_50px_rgba(30,144,255,0.8)] transform hover:scale-105 transition-all duration-300"
            >
              Vezi toate ofertele
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 1, category: "Auto, moto și ambarcațiuni", title: "BMW Seria 3 320d xDrive", subtitle: "2020 · 45.000 km · Diesel · Automat", price: "75.000", location: "București, Sector 1", views: "2.345", featured: true },
              { id: 2, category: "Imobiliare", title: "Apartament 2 camere decomandat", subtitle: "56 mp · Etaj 3 · 2025 · Parcare", price: "95.000 EUR", location: "Cluj-Napoca, Mănăștur", views: "1.892", featured: true },
              { id: 3, category: "Electronice și electrocasnice", title: "iPhone 14 Pro Max 256GB", subtitle: "Deep Purple · Garantie · Impecabil", price: "4.500", location: "Timișoara, Centru", views: "3.156", featured: false },
              { id: 4, category: "Sport, timp liber și artă", title: "Bicicletă MTB Giant Talon", subtitle: "2023 · 29 inch · Shimano 21 viteze", price: "1.600", location: "Brașov, Centru", views: "892", featured: false }
            ].map((item, index) => (
              <Link 
                key={item.id} 
                href="/listings"
                className="card-3d group cursor-pointer relative overflow-hidden rounded-2xl border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all duration-500"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Vibrant Image Container */}
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={categoryData[item.category]?.image || ""}
                    alt={item.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Colorful Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF7900]/40 via-transparent to-[#B537F2]/40 mix-blend-color"></div>
                  
                  {/* Featured Badge with Glow */}
                  {item.featured && (
                    <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-[#FFB84D] via-[#FF7900] to-[#E66D00] text-white text-xs font-black rounded-full shadow-[0_0_20px_rgba(255,121,0,0.8)] animate-pulse">
                      ⭐ TOP ANUNȚ
                    </div>
                  )}
                  
                  {/* Views Counter with Glass Effect */}
                  <div className="absolute bottom-4 left-4 glass-dark text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-bold border border-white/10">
                    <svg className="w-5 h-5 text-[#1E90FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {item.views}
                  </div>
                </div>
                
                {/* Content with Glass Effect */}
                <div className="glass-dark p-6 border-t border-[#2A2A2A]">
                  <h3 className="font-black text-xl text-white mb-3 group-hover:text-[#FF7900] transition line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 line-clamp-1 font-medium">
                    {item.subtitle}
                  </p>
                  
                  <div className="mb-4">
                    <div className="text-3xl font-black bg-gradient-to-r from-[#FF7900] to-[#FFB84D] bg-clip-text text-transparent">
                      {item.price} {!item.price.includes('EUR') && 'RON'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <svg className="w-5 h-5 text-[#1E90FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold">{item.location}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t border-[#2A2A2A]">
                    <button className="flex-1 glass-dark hover:bg-gradient-to-r hover:from-[#1E90FF] hover:to-[#4DA6FF] text-white py-3 px-4 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-[#2A2A2A] hover:border-[#1E90FF]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Sună
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white py-3 px-4 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,121,0,0.5)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Chat
                    </button>
                  </div>
                </div>

                {/* 3D Glow Effect */}
                <div className="absolute inset-0 rounded-2xl shadow-[0_20px_60px_rgba(255,121,0,0)] group-hover:shadow-[0_20px_60px_rgba(255,121,0,0.3)] transition-shadow duration-500 pointer-events-none"></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Dark Theme with 3D Cards */}
      <section className="max-w-7xl mx-auto px-4 py-20 relative">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-5">
            <span className="text-white">De ce </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">ClickAnunț</span>
            <span className="text-white">?</span>
          </h2>
          <p className="text-gray-400 text-xl font-medium">Platforma de anunțuri #1 în România</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-10">
          <div className="card-3d group text-center glass-dark rounded-2xl p-10 border-2 border-[#2A2A2A] hover:border-[#FF7900] transition-all duration-500">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-3xl p-8 transform group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-500 shadow-[0_0_40px_rgba(255,121,0,0.6)]">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h3 className="font-black text-2xl mb-4 text-white group-hover:text-[#FF7900] transition-colors">100% Verificat</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Toate anunțurile sunt verificate automat și manual pentru siguranța ta maximă
            </p>
          </div>
          
          <div className="card-3d group text-center glass-dark rounded-2xl p-10 border-2 border-[#2A2A2A] hover:border-[#1E90FF] transition-all duration-500">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="relative bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-3xl p-8 transform group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-500 shadow-[0_0_40px_rgba(30,144,255,0.6)]">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="font-black text-2xl mb-4 text-white group-hover:text-[#1E90FF] transition-colors">Super Rapid</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Publică anunțul tău în mai puțin de 2 minute. Zero birocrație, rezultate imediate
            </p>
          </div>
          
          <div className="card-3d group text-center glass-dark rounded-2xl p-10 border-2 border-[#2A2A2A] hover:border-[#39FF14] transition-all duration-500">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14] to-[#00FF00] rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative bg-gradient-to-br from-[#39FF14] to-[#00FF00] rounded-3xl p-8 transform group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-500 shadow-[0_0_40px_rgba(57,255,20,0.6)]">
                <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="font-black text-2xl mb-4 text-white group-hover:text-[#39FF14] transition-colors">100% Gratuit</h3>
            <p className="text-gray-400 leading-relaxed text-lg">
              Publică anunțuri nelimitat, fără costuri, fără comisioane. Întotdeauna gratuit!
            </p>
          </div>
        </div>

        {/* Trust Stats Bar with Neon Glow */}
        <div className="mt-16 glass-dark rounded-3xl p-10 border-2 border-[#2A2A2A] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF7900]/10 via-[#1E90FF]/10 to-[#B537F2]/10 animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            <div>
              <div className="text-4xl font-extrabold text-[#FF7900] mb-2">50K+</div>
              <div className="text-sm font-medium opacity-90">Anunțuri active</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#FF7900] mb-2">100K+</div>
              <div className="text-sm font-medium opacity-90">Utilizatori verificați</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#FF7900] mb-2">1M+</div>
              <div className="text-sm font-medium opacity-90">Vizitatori lunar</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#FF7900] mb-2">4.8★</div>
              <div className="text-sm font-medium opacity-90">Rating mediu</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile.de Style Call to Action */}
      <section className="relative overflow-hidden py-24 bg-gradient-to-br from-[#FF7900] via-[#FF8F1F] to-[#FF7900]">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#003D5C] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-block mb-6 px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm uppercase tracking-wider">
            ⚡ Începe acum - E simplu și rapid
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight relative">
            <span className="relative inline-block">
              Ai ceva de vânzare?
              <div className="absolute -bottom-3 left-0 right-0 h-2 bg-gradient-to-r from-[#FF7900] to-[#FFB84D] rounded-full"></div>
            </span>
            <br/>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] via-[#FFB84D] to-[#FF7900]">
              Publică GRATUIT!
            </span>
          </h2>
          <p className="text-gray-300 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Publică anunțul tău în doar 2 minute și găsește cumpărători din toată România. Zero comisioane, zero costuri ascunse!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link
              href="/listings/new"
              className="group inline-flex items-center gap-4 bg-gradient-to-r from-[#1E90FF] to-[#4DA6FF] hover:from-[#4DA6FF] hover:to-[#1E90FF] text-white px-12 py-6 rounded-2xl font-black text-xl transition-all shadow-[0_0_40px_rgba(30,144,255,0.6)] hover:shadow-[0_0_60px_rgba(30,144,255,0.9)] transform hover:scale-105"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
              <span>ADAUGĂ ANUNȚ ACUM</span>
              <svg className="w-7 h-7 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            
            <Link
              href="/listings"
              className="inline-flex items-center gap-4 glass-dark hover:bg-white/10 text-white px-10 py-6 rounded-2xl font-black text-xl transition-all shadow-xl hover:shadow-2xl border-2 border-white/20 hover:border-white/40"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>SAU CAUTĂ ANUNȚURI</span>
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 text-white relative">
            <div className="flex items-center gap-3 glass-dark px-6 py-3 rounded-xl border border-white/10">
              <div className="bg-[#39FF14]/20 rounded-full p-2">
                <svg className="w-6 h-6 text-[#39FF14]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-lg">Fără costuri</span>
            </div>
            <div className="flex items-center gap-3 glass-dark px-6 py-3 rounded-xl border border-white/10">
              <div className="bg-[#FF7900]/20 rounded-full p-2">
                <svg className="w-6 h-6 text-[#FF7900]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-lg">Publicare instant</span>
            </div>
            <div className="flex items-center gap-3 glass-dark px-6 py-3 rounded-xl border border-white/10">
              <div className="bg-[#1E90FF]/20 rounded-full p-2">
                <svg className="w-6 h-6 text-[#1E90FF]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-lg">Vizibilitate maximă</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Dark Theme with Neon Accents */}
      <footer className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-black border-t border-[#2A2A2A]">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF7900]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1E90FF]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-3 text-3xl font-black mb-6 hover:opacity-80 transition group">
                <span className="text-5xl transform group-hover:scale-110 transition-transform">📦</span>
                <div className="flex flex-col">
                  <span className="text-white">Click</span>
                  <span className="text-[#FF7900] -mt-2">Anunț</span>
                </div>
              </Link>
              <p className="text-gray-400 mb-6 leading-relaxed text-lg font-medium">
                Platforma #1 de anunțuri gratuite din România. 
                <br/>Peste <span className="text-[#FF7900] font-bold">50.000</span> de anunțuri verificate.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-12 h-12 glass-dark hover:bg-gradient-to-r hover:from-[#FF7900] hover:to-[#E66D00] rounded-xl flex items-center justify-center transition-all hover:scale-110 transform text-xl border border-[#2A2A2A] hover:border-[#FF7900]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-12 h-12 glass-dark hover:bg-gradient-to-r hover:from-[#1E90FF] hover:to-[#4DA6FF] rounded-xl flex items-center justify-center transition-all hover:scale-110 transform text-xl border border-[#2A2A2A] hover:border-[#1E90FF]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/><path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-12 h-12 glass-dark hover:bg-gradient-to-r hover:from-[#B537F2] hover:to-[#7B2BF9] rounded-xl flex items-center justify-center transition-all hover:scale-110 transform text-xl border border-[#2A2A2A] hover:border-[#B537F2]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="font-black mb-5 text-lg text-[#FF7900] uppercase tracking-wide">Platformă</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/about" className="hover:text-[#FF7900] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Despre noi
                </Link></li>
                <li><Link href="/terms" className="hover:text-[#FF7900] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Termeni și condiții
                </Link></li>
                <li><Link href="/privacy" className="hover:text-[#FF7900] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Confidențialitate
                </Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-black mb-5 text-lg text-[#1E90FF] uppercase tracking-wide">Asistență</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/help" className="hover:text-[#1E90FF] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Cum funcționează
                </Link></li>
                <li><Link href="/contact" className="hover:text-[#1E90FF] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Contact
                </Link></li>
                <li><Link href="/faq" className="hover:text-[#1E90FF] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Întrebări frecvente
                </Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-black mb-5 text-lg text-[#B537F2] uppercase tracking-wide">Cont</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/auth/login" className="hover:text-[#B537F2] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Autentificare
                </Link></li>
                <li><Link href="/auth/signup" className="hover:text-[#B537F2] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Înregistrare
                </Link></li>
                <li><Link href="/listings/new" className="hover:text-[#B537F2] hover:translate-x-1 inline-flex items-center gap-2 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  Adaugă anunț
                </Link></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Bar with Neon Glow */}
          <div className="glass-dark rounded-3xl p-8 mb-8 border-2 border-[#2A2A2A] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF7900]/20 via-[#1E90FF]/20 to-[#B537F2]/20"></div>
            <div className="grid md:grid-cols-3 gap-8 text-center md:text-left relative">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,121,0,0.5)]">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Email</div>
                  <a href="mailto:contact@clickanunt.ro" className="hover:text-[#FF7900] transition-colors font-black text-lg text-white">
                    contact@clickanunt.ro
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(30,144,255,0.5)]">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Telefon</div>
                  <a href="tel:+40784712496" className="hover:text-[#1E90FF] transition-colors font-black text-lg text-white">
                    +40 784 712 496
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#B537F2] to-[#7B2BF9] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(181,55,242,0.5)]">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Adresă</div>
                  <div className="font-black text-lg text-white">
                    București, România
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#2A2A2A] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-center md:text-left">
              <p className="font-medium">
                © 2026 <span className="font-black text-white">ClickAnunț</span>. Toate drepturile rezervate.
              </p>
              <p className="text-sm mt-1">
                Made with <span className="text-[#FF7900]">❤️</span> in România 🇷🇴
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-5 py-3 glass-dark rounded-xl text-sm font-bold border border-[#2A2A2A]">
                🔒 Plăți securizate
              </span>
              <span className="px-5 py-3 glass-dark rounded-xl text-sm font-bold border border-[#2A2A2A]">
                ✓ Verificat SSL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
