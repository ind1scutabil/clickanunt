import React from "react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

function getCategoryImage(category: string): string {
  const categoryImages: { [key: string]: string } = {
    "Auto, moto și ambarcațiuni": "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop",
    "Imobiliare": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop",
    "Electronice și electrocasnice": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=600&fit=crop",
    "Modă și frumusețe": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
    "Casă și grădină": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&h=600&fit=crop",
    "Sport, timp liber și artă": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
    "Copii și bebeluși": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=600&fit=crop",
    "Animale de companie": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop",
    "Locuri de muncă": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    "Servicii și afaceri": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&h=600&fit=crop",
    "Agricultură": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop",
    "Altele": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=600&fit=crop"
  };
  return categoryImages[category] || "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=600&fit=crop";
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/listings/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Anunț inexistent</h1>
            <p className="text-gray-600 mb-8">Ne pare rău, acest anunț nu mai este disponibil.</p>
            <Link href="/listings" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
              Întoarce-te la anunțuri
            </Link>
          </div>
        </main>
      </>
    );
  }
  
  const listing = await res.json();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Left/Center Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img 
                    src={getCategoryImage(listing.category)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex gap-2 overflow-x-auto">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-20 h-20 rounded flex-shrink-0 overflow-hidden bg-gray-100">
                      <img 
                        src={getCategoryImage(listing.category)}
                        alt={`${listing.title} ${i}`}
                        className="w-full h-full object-cover opacity-70 hover:opacity-100 transition cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Title and Price */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                    <p className="text-gray-600">
                      {listing.category} {listing.subcategory && `› ${listing.subcategory}`}
                    </p>
                  </div>
                  {listing.isFeatured && (
                    <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-full">
                      Promovat
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-4xl font-bold text-blue-600">
                    {listing.priceAmount?.toLocaleString()} {listing.priceCurrency}
                  </p>
                  <div className="flex gap-2">
                    <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" title="Adaugă la favorite">
                      <span className="text-2xl">❤️</span>
                    </button>
                    <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" title="Distribuie">
                      <span className="text-2xl">📤</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Detalii</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {listing.condition && (
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-gray-600">Stare</span>
                      <span className="font-medium">
                        {listing.condition === "new" && "Nou"}
                        {listing.condition === "used" && "Folosit"}
                        {listing.condition === "refurbished" && "Recondiționat"}
                        {listing.condition === "for_parts" && "Pentru piese"}
                      </span>
                    </div>
                  )}
                  
                  {/* Auto-specific fields */}
                  {listing.category === "Auto, moto și ambarcațiuni" && (
                    <>
                      {listing.make && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">Marcă</span>
                          <span className="font-medium">{listing.make}</span>
                        </div>
                      )}
                      {listing.model && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">Model</span>
                          <span className="font-medium">{listing.model}</span>
                        </div>
                      )}
                      {listing.year && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">An fabricație</span>
                          <span className="font-medium">{listing.year}</span>
                        </div>
                      )}
                      {listing.mileage && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">Kilometraj</span>
                          <span className="font-medium">{listing.mileage.toLocaleString()} km</span>
                        </div>
                      )}
                      {listing.fuel && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">Combustibil</span>
                          <span className="font-medium">{listing.fuel}</span>
                        </div>
                      )}
                      {listing.transmission && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-gray-600">Transmisie</span>
                          <span className="font-medium">{listing.transmission}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {listing.county && (
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-gray-600">Județ</span>
                      <span className="font-medium">{listing.county}</span>
                    </div>
                  )}
                  {listing.city && (
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-gray-600">Oraș</span>
                      <span className="font-medium">{listing.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Descriere</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {listing.description || "Fără descriere."}
                </p>
              </div>

              {/* Statistics */}
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between text-sm text-gray-600">
                <span>👁️ {listing.views} vizualizări</span>
                <span>📅 Publicat la {new Date(listing.createdAt).toLocaleDateString("ro-RO")}</span>
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Seller Card */}
              <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                <h3 className="font-bold text-lg mb-4">Vânzător</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {listing.owner?.email?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{listing.owner?.email}</p>
                    <p className="text-sm text-gray-500">Membru din 2024</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <span>💬</span>
                    <span>Trimite mesaj</span>
                  </button>
                  <button className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-medium hover:bg-blue-50 transition flex items-center justify-center gap-2">
                    <span>📞</span>
                    <span>Afișează telefon</span>
                  </button>
                </div>

                <button className="w-full mt-4 text-red-600 text-sm hover:text-red-700 flex items-center justify-center gap-1">
                  <span>⚠️</span>
                  <span>Raportează anunțul</span>
                </button>
              </div>

              {/* Safety Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Sfaturi de siguranță</span>
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Nu plăti în avans</li>
                  <li>• Verifică produsul înainte</li>
                  <li>• Întâlnește-te în locuri publice</li>
                  <li>• Verifică autenticitatea</li>
                </ul>
              </div>

              {/* Share Buttons */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-bold mb-3">Distribuie anunțul</h4>
                <div className="flex gap-2">
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50" title="Facebook">📘</button>
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50" title="WhatsApp">💬</button>
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50" title="Copiază link">🔗</button>
                </div>
              </div>
            </div>
          </div>

          {/* Similar Listings */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Anunțuri similare</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition cursor-pointer group">
                  <div className="aspect-video bg-gray-200 overflow-hidden">
                    <img 
                      src={getCategoryImage(listing.category)}
                      alt={`Similar product ${i}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition">Produs similar #{i}</h3>
                    <p className="text-xl font-bold text-blue-600">XX.XXX RON</p>
                    <p className="text-sm text-gray-500 mt-2">📍 București</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
