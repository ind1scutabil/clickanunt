"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { ALL_CATEGORIES } from "@/lib/carData";
import { SearchBar } from "@/app/components/composite";
import { Button, Card, Badge } from "@/app/components/ui";
import { CountUp } from "@/app/components/ui/CountUp";
import { StatsStripSafe } from "@/app/components/enterprise";
import { TrustBadges } from "@/app/components/enterprise";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Homepage is public to all users
  }, []);
  

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

  const handleSearch = (query: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (category) params.append('category', category);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0F1117]">
        {/* Hero Section */}
        <section className="relative min-h-[640px] flex items-center justify-center overflow-hidden pt-8">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
          </div>
          
          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {/* Title */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-[#161B22] text-sm text-white/80 mb-6">
                <span className="inline-block h-2 w-2 rounded-full bg-white/60" />
                Platformă enterprise pentru anunțuri verificate
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight text-white">
                Găsește rapid
                {" "}
                <span className="text-indigo-300">oportunitățile potrivite</span>
                <br />
                <span className="text-white/70">în toată România, cu încredere</span>
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Peste <span className="text-white font-semibold">50.000</span> anunțuri verificate, filtre inteligente și protecție anti-fraudă.
              </p>
            </div>
            
            {/* Search Box - NEW DESIGN SYSTEM */}
            <div className="max-w-4xl mx-auto mb-8">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Caută mașini, apartamente, telefoane..."
                categories={ALL_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                showCategory
              />
            </div>

            {/* Trust Badges - Enterprise Safety Layer */}
            <TrustBadges />

            {/* Trust Signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-white/70">
              <Badge outlined pill className="px-4 py-2">✔️ Anunțuri verificate</Badge>
              <Badge outlined pill className="px-4 py-2">🔒 Protecție anti-fraudă</Badge>
              <Badge outlined pill className="px-4 py-2">⚡ Răspuns rapid</Badge>
              <Badge outlined pill className="px-4 py-2">⭐ Suport dedicat</Badge>
            </div>

            {/* Quick Actions - NEW DESIGN SYSTEM */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link href="/listings/new">
                <Button variant="primary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adaugă Anunț
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary" size="lg">
                  Conectează-te
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Grid - NEW DESIGN SYSTEM */}
        <section className="max-w-7xl mx-auto px-4 py-28">
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
              const isPopular = popularCategories.has(categoryName);
              
              return (
                <Link
                  key={categoryName}
                  href={`/listings?category=${encodeURIComponent(categoryName)}`}
                >
                  <Card 
                    variant="elevated" 
                    interactive
                    className="group relative h-64 sm:h-72 overflow-hidden transition-all duration-500"
                  >
                    {/* Background Image */}
                    <img
                      src={image}
                      alt={categoryName}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
                    <div className="absolute inset-0 bg-black/10" />
                    
                    {/* Content */}
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1A1D24]/70 backdrop-blur-sm border border-white/10">
                          <span className="text-2xl">{data.icon}</span>
                        </div>
                        {isPopular && (
                          <Badge variant="warning" className="font-bold">
                            POPULAR
                          </Badge>
                        )}
                      </div>

                      <div>
                        <Badge variant="primary" size="sm" className="mb-4">
                          <span className="inline-block h-2 w-2 rounded-full bg-white mr-2" />
                          {data.count} anunțuri
                        </Badge>

                        <h3 className="text-xl font-black text-white group-hover:text-[#8AB4FF] transition-colors mb-3">
                          {categoryName}
                        </h3>

                        <div className="flex items-center gap-3 text-sm text-gray-200">
                          <span className="opacity-80">Vezi anunțuri</span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition">
                            <svg className="w-4 h-4 text-[#8AB4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Stats Section - NEW DESIGN SYSTEM */}
        <StatsStripSafe />

        {/* Features Section - NEW DESIGN SYSTEM */}
        <section className="max-w-7xl mx-auto px-4 py-28 pb-40">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              De ce{" "}
              <span className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                ClickAnunț?
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-white mb-3">Rapid și Ușor</h3>
                <p className="text-gray-400">Publică un anunț în doar 2 minute. Interfață simplă și intuitivă.</p>
              </Card.Body>
            </Card>
            
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-white mb-3">Sigur și Verificat</h3>
                <p className="text-gray-400">Toate anunțurile sunt moderate. Protejăm datele tale personale.</p>
              </Card.Body>
            </Card>
            
            <Card variant="elevated" className="p-8 transition-all hover:border-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <Card.Body>
                <div className="text-4xl mb-4">💯</div>
                <h3 className="text-xl font-bold text-white mb-3">100% Gratuit</h3>
                <p className="text-gray-400">Fără costuri ascunse. Publică nelimitat, fără abonament.</p>
              </Card.Body>
            </Card>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
