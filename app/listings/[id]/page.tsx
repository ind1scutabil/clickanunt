'use client';
import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { memoryStorage } from "@/lib/memory-storage";

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

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'Utilizator verificat';
  const visible = localPart.length > 2 ? localPart.slice(0, 2) : localPart.slice(0, 1);
  return `${visible}***@${domain}`;
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // Check if listing is in favorites
  useEffect(() => {
    if (id) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(id));
    }
  }, [id]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const loadListing = async () => {
      try {
        // Always use the API endpoint - it handles both in-memory and database modes
        const res = await fetch(`/api/listings/${id}`, {
          cache: "no-store",
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('📄 Loaded listing:', data);
          setListing(data);
        } else {
          console.error('Failed to load listing:', res.statusText);
        }
      } catch (error) {
        console.error('Error loading listing:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadListing();
    }
  }, [id]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      // Remove from favorites
      const updated = favorites.filter((fav: string) => fav !== id);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
    } else {
      // Add to favorites
      favorites.push(id);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`${listing.title} - ${listing.priceAmount} ${listing.priceCurrency}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      alert('Link copiat: ' + window.location.href);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `${listing.title} - ${listing.priceAmount} ${listing.priceCurrency}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      copyLink();
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

  const ownerId = listing.ownerUserId || listing.owner?.id;
  const isOwner = Boolean(currentUser?.id && ownerId && currentUser.id === ownerId);
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const canPromote = isOwner; // Only owner can promote their own listing
  const sellerEmail = listing.owner?.email || '';
  const sellerName = listing.owner?.name || '';
  const sellerDisplayName = sellerName || (sellerEmail ? (isOwner || isPrivileged ? sellerEmail : maskEmail(sellerEmail)) : 'Vânzător verificat');
  const sellerInitial = sellerDisplayName.charAt(0).toUpperCase();
  const sellerPhone = listing.contactPhone || listing.owner?.phone || listing.owner?.businessPhone || '';

  return (
    <>
      <Navbar />
      
      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button 
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
            onClick={() => setShowImageModal(false)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {listing.photos && listing.photos.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={selectedImageIndex === 0}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.min(listing.photos.length - 1, prev + 1));
                }}
                disabled={selectedImageIndex === listing.photos.length - 1}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <div className="max-w-7xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={(listing.photos && listing.photos[selectedImageIndex]) || getCategoryImage(listing.category)}
              alt={listing.title}
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              priority
              unoptimized={listing.photos && listing.photos[selectedImageIndex] ? true : false}
            />
            {listing.photos && listing.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 text-white text-sm font-medium">
                {selectedImageIndex + 1} / {listing.photos.length}
              </div>
            )}
          </div>
        </div>
      )}
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Left/Center Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6D5BFF]/10 to-[#00D4FF]/10 blur-3xl"></div>
                <div 
                  className="relative aspect-video bg-gray-900/50 overflow-hidden cursor-pointer group"
                  onClick={() => setShowImageModal(true)}
                >
                  <Image 
                    src={(listing.photos && listing.photos[selectedImageIndex]) || getCategoryImage(listing.category)}
                    alt={listing.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    priority
                    unoptimized={listing.photos && listing.photos[selectedImageIndex] ? true : false}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-md rounded-full p-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {listing.photos && listing.photos.length > 1 && (
                  <div className="relative p-4 flex gap-2 overflow-x-auto bg-gray-900/30">
                    {listing.photos.map((photo: string, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden bg-gray-800 border-2 transition-all cursor-pointer ${
                          selectedImageIndex === i 
                            ? 'border-[#6366F1] ring-2 ring-[#6366F1]/50 shadow-lg shadow-[#6366F1]/30' 
                            : 'border-gray-700/50 hover:border-[#6366F1]/70'
                        }`}
                      >
                        <Image 
                          src={photo}
                          alt={`${listing.title} ${i + 1}`}
                          fill
                          className={`object-cover transition ${
                            selectedImageIndex === i ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                          }`}
                          sizes="80px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title and Price */}
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6D5BFF]/5 to-[#00D4FF]/5 rounded-3xl"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h1 className="text-4xl font-black text-white mb-3 leading-tight">{listing.title}</h1>
                      <p className="text-gray-400 text-lg flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-[#00D4FF] rounded-full"></span>
                        {listing.category} {listing.subcategory && `› ${listing.subcategory}`}
                      </p>
                    </div>
                    {listing.isFeatured && (
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                        ⭐ Promovat
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-700/50 pt-6">
                    <div>
                      <p className="text-5xl font-black bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#4E3CFF] bg-clip-text text-transparent">
                        {listing.priceAmount?.toLocaleString()} {listing.priceCurrency}
                      </p>
                    </div>
                    <div className="flex gap-3">
                    <button 
                      onClick={toggleFavorite}
                      className={`p-4 border-2 rounded-xl transition-all transform hover:scale-110 hover:rotate-6 ${
                        isFavorite 
                          ? 'bg-gradient-to-br from-red-500 to-pink-600 border-red-400 shadow-lg shadow-red-500/50' 
                          : 'bg-gray-800/80 border-gray-700/50 hover:border-red-500 hover:bg-red-500/10'
                      }`}
                      title={isFavorite ? "Elimină din favorite" : "Adaugă la favorite"}
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={isFavorite ? "white" : "none"} stroke={isFavorite ? "white" : "currentColor"} strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button 
                      onClick={shareNative}
                      className="p-4 bg-gradient-to-br from-[#00D4FF] to-[#00A8CC] border-2 border-[#00D4FF]/50 rounded-xl hover:shadow-xl hover:shadow-[#00D4FF]/30 transition-all transform hover:scale-110 hover:-rotate-6" 
                      title="Distribuie"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#4E3CFF]/5 to-transparent rounded-3xl"></div>
                <div className="relative">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] rounded-xl flex items-center justify-center text-white">
                      📋
                    </span>
                    Detalii Tehnice
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Fields */}
                    {listing.county && (
                      <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                        <span className="text-gray-400 font-medium">Județ</span>
                        <span className="text-white font-bold">📍 {listing.county}</span>
                      </div>
                    )}
                    {listing.city && (
                      <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                        <span className="text-gray-400 font-medium">Oraș</span>
                        <span className="text-white font-bold">🏙️ {listing.city}</span>
                      </div>
                    )}
                    
                    {/* Auto-specific fields */}
                    {listing.category === "Auto, moto și ambarcațiuni" && (
                      <>
                        {/* Basic Info */}
                        {listing.make && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Marcă</span>
                            <span className="text-white font-bold">🚗 {listing.make}</span>
                          </div>
                        )}
                        {listing.model && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Model</span>
                            <span className="text-white font-bold">{listing.model}</span>
                          </div>
                        )}
                        {(listing.attributes?.bodyType || listing.attributes?.body_type) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Caroserie</span>
                            <span className="text-white font-bold">🚙 {listing.attributes.bodyType || listing.attributes.body_type}</span>
                          </div>
                        )}
                        {listing.condition && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Stare</span>
                            <span className="text-white font-bold">
                              {(listing.condition === "new" || listing.condition === "Nou") && "✨ Nou"}
                              {(listing.condition === "used" || listing.condition === "Folosit") && "🔄 Folosit"}
                              {(listing.condition === "refurbished" || listing.condition === "Recondiționat") && "🔧 Recondiționat"}
                              {(listing.condition === "for_parts" || listing.condition === "Pentru piese") && "⚙️ Pentru piese"}
                              {!['new', 'used', 'refurbished', 'for_parts', 'Nou', 'Folosit', 'Recondiționat', 'Pentru piese'].includes(listing.condition) && listing.condition}
                            </span>
                          </div>
                        )}
                        
                        {/* Year & Registration */}
                        {listing.year && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">An fabricație</span>
                            <span className="text-white font-bold">📅 {listing.year}</span>
                          </div>
                        )}
                        {(listing.attributes?.firstRegistration || listing.attributes?.first_registration) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Prima înmatriculare</span>
                            <span className="text-white font-bold">📆 {listing.attributes.firstRegistration || listing.attributes.first_registration}</span>
                          </div>
                        )}
                        {listing.mileage && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Kilometraj</span>
                            <span className="text-white font-bold">🛣️ {listing.mileage.toLocaleString()} km</span>
                          </div>
                        )}
                        {listing.vin && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">VIN</span>
                            <span className="text-white font-bold font-mono text-sm">🔖 {listing.vin}</span>
                          </div>
                        )}
                        
                        {/* Engine & Performance */}
                        {listing.fuel && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Combustibil</span>
                            <span className="text-white font-bold">⛽ {listing.fuel}</span>
                          </div>
                        )}
                        {(listing.attributes?.horsePower || listing.attributes?.horse_power || listing.attributes?.hp) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Putere</span>
                            <span className="text-white font-bold">🐎 {listing.attributes.horsePower || listing.attributes.horse_power || listing.attributes.hp} CP</span>
                          </div>
                        )}
                        {(listing.attributes?.engineCapacity || listing.attributes?.engine_capacity || listing.attributes?.capacity) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Capacitate cilindrică</span>
                            <span className="text-white font-bold">🔧 {listing.attributes.engineCapacity || listing.attributes.engine_capacity || listing.attributes.capacity} cm³</span>
                          </div>
                        )}
                        {listing.transmission && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Transmisie</span>
                            <span className="text-white font-bold">⚙️ {listing.transmission}</span>
                          </div>
                        )}
                        {(listing.attributes?.drivetrain || listing.attributes?.drive_train) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Tracțiune</span>
                            <span className="text-white font-bold">🔄 {listing.attributes.drivetrain || listing.attributes.drive_train}</span>
                          </div>
                        )}
                        
                        {/* Exterior & Interior */}
                        {listing.attributes?.color && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Culoare</span>
                            <span className="text-white font-bold">🎨 {listing.attributes.color}</span>
                          </div>
                        )}
                        {(listing.attributes?.upholstery || listing.attributes?.interior) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Tapițerie</span>
                            <span className="text-white font-bold">🪑 {listing.attributes.upholstery || listing.attributes.interior}</span>
                          </div>
                        )}
                        {(listing.attributes?.doors || listing.attributes?.door_count) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Uși</span>
                            <span className="text-white font-bold">🚪 {listing.attributes.doors || listing.attributes.door_count}</span>
                          </div>
                        )}
                        {(listing.attributes?.seats || listing.attributes?.seat_count) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Locuri</span>
                            <span className="text-white font-bold">💺 {listing.attributes.seats || listing.attributes.seat_count}</span>
                          </div>
                        )}
                        
                        {/* History & Ownership */}
                        {(listing.attributes?.owners || listing.attributes?.owner_count || listing.attributes?.numberOfOwners) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Număr proprietari</span>
                            <span className="text-white font-bold">👥 {listing.attributes.owners || listing.attributes.owner_count || listing.attributes.numberOfOwners}</span>
                          </div>
                        )}
                        {(listing.attributes?.keys || listing.attributes?.key_count) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Chei</span>
                            <span className="text-white font-bold">🔑 {listing.attributes.keys || listing.attributes.key_count}</span>
                          </div>
                        )}
                        {(listing.attributes?.priorDamage !== undefined || listing.attributes?.prior_damage !== undefined || listing.attributes?.accident !== undefined) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Daune anterioare</span>
                            <span className="text-white font-bold">
                              {(listing.attributes.priorDamage === false || listing.attributes.prior_damage === false || listing.attributes.accident === false || listing.attributes.priorDamage === 'Nu' || listing.attributes.prior_damage === 'Nu') 
                                ? '✅ Nu' 
                                : (listing.attributes.priorDamage === true || listing.attributes.prior_damage === true || listing.attributes.accident === true || listing.attributes.priorDamage === 'Da' || listing.attributes.prior_damage === 'Da')
                                ? '⚠️ Da'
                                : listing.attributes.priorDamage || listing.attributes.prior_damage || listing.attributes.accident
                              }
                            </span>
                          </div>
                        )}
                        {(listing.attributes?.serviceHistory || listing.attributes?.service_history) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Istoric service</span>
                            <span className="text-white font-bold">📋 {listing.attributes.serviceHistory || listing.attributes.service_history}</span>
                          </div>
                        )}
                        
                        {/* Legal & Compliance */}
                        {(listing.attributes?.countryOfOrigin || listing.attributes?.country_of_origin) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Țara de origine</span>
                            <span className="text-white font-bold">🌍 {listing.attributes.countryOfOrigin || listing.attributes.country_of_origin}</span>
                          </div>
                        )}
                        {(listing.attributes?.lastRegistrationCountry || listing.attributes?.last_registration_country) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Ultima înmatriculare</span>
                            <span className="text-white font-bold">🌍 {listing.attributes.lastRegistrationCountry || listing.attributes.last_registration_country}</span>
                          </div>
                        )}
                        {(listing.attributes?.environmentalClass || listing.attributes?.environmental_class || listing.attributes?.emission_standard) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Normă poluare</span>
                            <span className="text-white font-bold">🌱 {listing.attributes.environmentalClass || listing.attributes.environmental_class || listing.attributes.emission_standard}</span>
                          </div>
                        )}
                        {(listing.attributes?.inspectionValid || listing.attributes?.inspection_valid || listing.attributes?.itp) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">ITP valabil până</span>
                            <span className="text-white font-bold">✅ {listing.attributes.inspectionValid || listing.attributes.inspection_valid || listing.attributes.itp}</span>
                          </div>
                        )}
                        {(listing.attributes?.warranty || listing.attributes?.garantie) && (
                          <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                            <span className="text-gray-400 font-medium">Garanție</span>
                            <span className="text-white font-bold">🛡️ {listing.attributes.warranty || listing.attributes.garantie}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Generic condition field for non-auto categories */}
                    {listing.category !== "Auto, moto și ambarcațiuni" && listing.condition && (
                      <div className="flex justify-between items-center py-3 px-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                        <span className="text-gray-400 font-medium">Stare</span>
                        <span className="text-white font-bold">
                          {(listing.condition === "new" || listing.condition === "Nou") && "✨ Nou"}
                          {(listing.condition === "used" || listing.condition === "Folosit") && "🔄 Folosit"}
                          {(listing.condition === "refurbished" || listing.condition === "Recondiționat") && "🔧 Recondiționat"}
                          {(listing.condition === "for_parts" || listing.condition === "Pentru piese") && "⚙️ Pentru piese"}
                          {!['new', 'used', 'refurbished', 'for_parts', 'Nou', 'Folosit', 'Recondiționat', 'Pentru piese'].includes(listing.condition) && listing.condition}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 to-transparent rounded-3xl"></div>
                <div className="relative">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center text-white">
                      📝
                    </span>
                    Descriere
                  </h2>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                    {listing.description || "Fără descriere."}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/30 flex items-center justify-between text-sm shadow-lg">
                <span className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="text-xl">👁️</span>
                  <span className="text-white font-bold">{listing.views || 0}</span> vizualizări
                </span>
                <span className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  Publicat la <span className="text-white font-bold">{new Date(listing.createdAt).toLocaleDateString("ro-RO")}</span>
                </span>
              </div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Seller Card */}
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-6 sticky top-24">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6D5BFF]/10 to-transparent rounded-3xl pointer-events-none"></div>
                <div className="relative">
                  <h3 className="font-black text-xl text-white mb-5 flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    Vânzător
                  </h3>
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                      {sellerInitial || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{sellerDisplayName}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <span>✅</span> Membru din 2024
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {isOwner && (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => router.push(`/listings/${id}/edit`)}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>✏️</span>
                          <span>Editează</span>
                        </button>
                        <button 
                          onClick={() => router.push(`/listings/${id}/promote`)}
                          className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white py-3 rounded-xl font-bold hover:shadow-xl hover:shadow-yellow-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>🚀</span>
                          <span>Promovează</span>
                        </button>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => router.push(`/listings/${id}/messages`)}
                      className="w-full bg-gradient-to-r from-[#6D5BFF] to-[#4E3CFF] text-white py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#6D5BFF]/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>💬</span>
                      <span>Trimite mesaj</span>
                    </button>
                    <button 
                      onClick={() => setShowPhone(true)}
                      className="w-full bg-gray-900/70 border-2 border-[#00D4FF] text-[#00D4FF] py-4 rounded-xl font-bold hover:bg-[#00D4FF]/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>📞</span>
                      <span>{showPhone ? (sellerPhone || 'Fără telefon') : 'Afișează telefon'}</span>
                    </button>
                  </div>

                  <button className="w-full mt-4 text-red-400 hover:text-red-300 text-sm font-medium flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 rounded-xl border border-red-500/30 hover:bg-red-500/20 transition-all">
                    <span>⚠️</span>
                    <span>Raportează anunțul</span>
                  </button>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl p-5 backdrop-blur-xl">
                <h4 className="font-black text-yellow-300 mb-3 flex items-center gap-2 text-lg">
                  <span>⚠️</span>
                  <span>Sfaturi de siguranță</span>
                </h4>
                <ul className="text-sm text-yellow-100 space-y-2 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Nu plăti în avans</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Verifică produsul înainte</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Întâlnește-te în locuri publice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Verifică autenticitatea</span>
                  </li>
                </ul>
              </div>

              {/* Share Buttons */}
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 p-6">
                <h4 className="font-black text-white mb-4 text-lg flex items-center gap-2">
                  <svg className="w-6 h-6 text-[#00D4FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Distribuie anunțul
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={shareOnFacebook}
                    className="flex-1 p-4 bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-500/50 rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 group" 
                    title="Facebook"
                  >
                    <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={shareOnWhatsApp}
                    className="flex-1 p-4 bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-400/50 rounded-xl hover:shadow-xl hover:shadow-green-500/30 transition-all transform hover:scale-105 active:scale-95 group" 
                    title="WhatsApp"
                  >
                    <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={copyLink}
                    className="relative flex-1 p-4 bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-600/50 rounded-xl hover:shadow-xl hover:shadow-gray-600/30 transition-all transform hover:scale-105 active:scale-95 group" 
                    title="Copiază link"
                  >
                    {showCopySuccess ? (
                      <svg className="w-6 h-6 mx-auto text-green-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 mx-auto text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                    {showCopySuccess && (
                      <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap font-bold shadow-lg">
                        ✓ Copiat!
                      </span>
                    )}
                  </button>
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
