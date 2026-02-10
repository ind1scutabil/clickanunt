"use client";
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
    <main className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Section Premium */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4">
        {/* Subtle Animated Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(-45deg, #0A0A0A, #12090A, #0A0912, #0A0A0A)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 20s ease infinite'
          }}
        />
        
        <div className="relative max-w-6xl mx-auto">
          {/* Title with Accent */}
          <div className="text-center mb-12" style={{ animation: 'fadeIn 0.8s ease-out' }}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Găsește </span>
              <span 
                className="bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  textShadow: '0 0 40px rgba(255, 121, 0, 0.15)'
                }}
              >
                exact
              </span>
              <span className="text-white"> ce cauți</span>
              <br />
              <span className="text-white opacity-90">în toată România</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Peste <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>50.000</span> anunțuri verificate
            </p>
          </div>
          
          {/* Premium Search Box */}
          <div className="max-w-4xl mx-auto">
            <div 
              className="glass rounded-2xl p-3 transition-all"
              style={{
                boxShadow: 'var(--shadow-md)',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Caută mașini, apartamente, telefoane..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/50 border border-gray-800 focus:border-[var(--accent-primary)] transition-all outline-none text-white placeholder-gray-500"
                  />
                </div>
                <select className="px-6 py-4 rounded-xl bg-black/50 border border-gray-800 focus:border-[var(--accent-primary)] transition-all outline-none text-white cursor-pointer">
                  <option value="">Toate categoriile</option>
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Link 
                  href="/listings"
                  className="btn btn-primary px-8"
                >
                  <span className="font-semibold">CAUTĂ</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid - Premium Clean Design */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-5 text-white">
            Toate <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[#FFB84D] bg-clip-text text-transparent">categoriile</span>
          </h2>
          <p className="text-gray-400 text-xl">Descoperă mii de anunțuri în 12 categorii diverse</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ALL_CATEGORIES.map((categoryName, index) => {
            const data = categoryData[categoryName] || { icon: "📦", color: "from-gray-500 to-gray-700", image: "" };
            
            return (
              <Link
                key={categoryName}
                href={`/listings?category=${encodeURIComponent(categoryName)}`}
                className="card-interactive stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image Background */}
                <div className="relative h-56 overflow-hidden rounded-t-2xl">
                  <div 
                    className="card-image absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${data.image})` }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-50`} />
                  
                  {/* Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="glass rounded-2xl p-5">
                      <span className="text-5xl">{data.icon}</span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5 bg-[var(--bg-secondary)] border-t border-white/5 rounded-b-2xl">
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                    {categoryName}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Vezi anunțuri</span>
                    <svg 
                      className="w-5 h-5 text-[var(--accent-primary)] transition-transform group-hover:translate-x-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-16">
          <Link href="/listings" className="btn btn-primary inline-flex items-center gap-3">
            <span>Explorează toate anunțurile</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Featured Listings - Premium Clean Design */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="text-5xl md:text-6xl font-black mb-3 text-white">
                Anunțuri <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[#FFB84D] bg-clip-text text-transparent">recomandate</span>
              </h2>
              <p className="text-gray-400 text-lg">Cele mai bune oferte selectate special pentru tine</p>
            </div>
            <Link href="/listings" className="btn btn-primary inline-flex items-center gap-3">
              Vezi toate ofertele
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 1, category: "Auto, moto și ambarcațiuni", title: "BMW Seria 3 320d xDrive", subtitle: "2020 · 45.000 km · Diesel", price: "32.500", location: "București, Sector 1", views: "2.345" },
              { id: 2, category: "Imobiliare", title: "Apartament 2 camere decomandat", subtitle: "56 mp · Etaj 3 · Parcare", price: "95.000 EUR", location: "Cluj-Napoca", views: "1.892" },
              { id: 3, category: "Electronice și electrocasnice", title: "iPhone 14 Pro Max 256GB", subtitle: "Deep Purple · Garantie", price: "4.500", location: "Timișoara, Centru", views: "892" },
              { id: 4, category: "Sport, timp liber și artă", title: "Bicicletă MTB Giant", subtitle: "2023 · 29 inch · Shimano", price: "1.600", location: "Brașov, Centru", views: "456" }
            ].map((item, index) => (
              <Link 
                key={item.id} 
                href="/listings"
                className="card-interactive stagger-item"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden rounded-t-2xl">
                  <img 
                    src={categoryData[item.category]?.image || ""}
                    alt={item.title}
                    className="card-image w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  
                  {/* Views */}
                  <div className="absolute bottom-4 left-4 glass text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {item.views}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 bg-[var(--bg-secondary)]">
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-[var(--accent-primary)] transition line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-1">{item.subtitle}</p>
                  
                  <div className="text-2xl font-black text-[var(--accent-primary)] mb-3">
                    {item.price} {!item.price.includes('EUR') && 'RON'}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{item.location}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Premium Clean Design */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-5 text-white">
            De ce <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[#FFB84D] bg-clip-text text-transparent">ClickAnunț</span>?
          </h2>
          <p className="text-gray-400 text-xl">Platforma de anunțuri #1 în România</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              icon: <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>,
              title: "100% Verificat",
              desc: "Toate anunțurile sunt verificate automat și manual pentru siguranța ta maximă",
              color: "var(--accent-primary)"
            },
            {
              icon: <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>,
              title: "Super Rapid",
              desc: "Publică anunțul tău în mai puțin de 2 minute. Zero birocrație, rezultate imediate",
              color: "#1E90FF"
            },
            {
              icon: <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>,
              title: "100% Gratuit",
              desc: "Publică anunțuri nelimitat, fără costuri, fără comisioane. Întotdeauna gratuit!",
              color: "#39FF14"
            }
          ].map((feature, idx) => (
            <div key={idx} className="card text-center p-8 group">
              <div className="inline-flex items-center justify-center mb-6 text-white">
                {feature.icon}
              </div>
              <h3 className="font-bold text-2xl mb-4 text-white">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust Stats */}
        <div className="mt-16 glass rounded-2xl p-10 border border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            <div>
              <div className="text-4xl font-black text-[var(--accent-primary)] mb-2">50K+</div>
              <div className="text-sm text-gray-400">Anunțuri active</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[var(--accent-primary)] mb-2">100K+</div>
              <div className="text-sm text-gray-400">Utilizatori verificați</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[var(--accent-primary)] mb-2">1M+</div>
              <div className="text-sm text-gray-400">Vizitatori lunar</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[var(--accent-primary)] mb-2">4.8★</div>
              <div className="text-sm text-gray-400">Rating mediu</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Premium Clean */}
      <section className="py-24 bg-gradient-to-br from-[var(--accent-primary)] via-[#FF8F1F] to-[var(--accent-primary)]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-block mb-6 px-6 py-2 glass rounded-full text-white font-bold text-sm uppercase tracking-wider">
            ⚡ Începe acum - E simplu și rapid
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
            Ai ceva de vânzare?
            <br/>
            <span className="text-black">Publică GRATUIT!</span>
          </h2>
          <p className="text-white/90 text-xl md:text-2xl mb-12 max-w-3xl mx-auto">
            Publică anunțul tău în doar 2 minute și găsește cumpărători din toată România. Zero comisioane!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link href="/listings/new" className="btn btn-primary bg-black hover:bg-gray-900 inline-flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>ADAUGĂ ANUNȚ ACUM</span>
            </Link>
            
            <Link href="/listings" className="btn glass text-white border-white/20 hover:bg-white/10 inline-flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>SAU CAUTĂ ANUNȚURI</span>
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 text-white">
            {[
              { icon: "✓", text: "Fără costuri" },
              { icon: "⚡", text: "Publicare instant" },
              { icon: "👁", text: "Vizibilitate maximă" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 glass px-6 py-3 rounded-xl border border-white/10">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
