'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrustBadgeCompact } from '@/app/components/TrustBadge';
import PromotedBadge from '@/app/components/PromotedBadge';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    priceAmount: number;
    priceCurrency: string;
    category: string;
    photos: string[];
    createdAt: string;
    status: string;
    isPromoted: boolean;
    views: number;
    owner?: {
      id: string;
      businessName?: string;
      trustScore: number;
      verificationLevel: 'none' | 'email' | 'phone' | 'business';
    };
  };
  showOwner?: boolean;
}

export function ListingCard({ listing, showOwner = false }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>('Recent');

  // Move date formatting to useEffect to avoid hydration mismatch
  useEffect(() => {
    const date = new Date(listing.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let result: string;
    if (diffDays === 0) result = 'Astăzi';
    else if (diffDays === 1) result = 'Ieri';
    else if (diffDays < 7) result = `Acum ${diffDays} zile`;
    else if (diffDays < 30) result = `Acum ${Math.floor(diffDays / 7)} săptămâni`;
    else if (diffDays < 365) result = `Acum ${Math.floor(diffDays / 30)} luni`;
    else result = date.toLocaleDateString('ro-RO');
    
    setFormattedDate(result);
  }, [listing.createdAt]);

  const formatPrice = (amount: number, currency: string) => {
    if (amount === 0) return 'Negociabil';
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const mainPhoto = listing.photos && listing.photos.length > 0 
    ? listing.photos[0] 
    : '/placeholder-listing.jpg';

  return (
    <Link href={`/listings/${listing.id}`}>
      <div
        className={`group relative bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-400 hover:-translate-y-2 cursor-pointer ${
          isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {!imageError ? (
            <img
              src={mainPhoto}
              alt={listing.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status Badge */}
          {listing.status === 'active' && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-lg">
                ✓ Activ
              </span>
            </div>
          )}
          
          {/* Promoted Badge */}
          {listing.isPromoted && (
            <div className="absolute top-3 right-3">
              <PromotedBadge size="sm" />
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/95 text-gray-800 backdrop-blur-sm shadow-md">
              {listing.category}
            </span>
          </div>
          
          {/* Photo Count */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm shadow-md hover:bg-black/80 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {listing.photos.length}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col h-full">
          {/* Title */}
          <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors text-base leading-tight">
            {listing.title}
          </h3>

          {/* Price - PROMINENT */}
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text">
              {formatPrice(listing.priceAmount, listing.priceCurrency)}
            </span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {listing.priceCurrency}
            </span>
          </div>

          {/* Metadata - Icons */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
            {/* Date */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-700">{formattedDate}</span>
            </div>
            
            {/* Views */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-semibold text-blue-700">{listing.views}</span>
            </div>
          </div>

          {/* Owner Info (if showOwner) */}
          {showOwner && listing.owner && (
            <div className="mt-auto pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {(listing.owner.businessName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">Vânzător</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {listing.owner.businessName || 'Utilizator'}
                    </span>
                  </div>
                </div>
                <TrustBadgeCompact
                  trustScore={listing.owner.trustScore}
                  verificationLevel={listing.owner.verificationLevel}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hover Actions Bar - PREMIUM */}
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-4 gap-3 animate-fadeIn">
            <button 
              onClick={(e) => { e.preventDefault(); }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
              title="Vezi detalii"
            >
              Vezi detalii
            </button>
            <div className="flex gap-3 w-full">
              <button 
                onClick={(e) => { e.preventDefault(); }}
                className="flex-1 p-2.5 bg-white/95 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl transform hover:scale-105"
                title="Adaugă la favorite"
              >
                <svg className="w-5 h-5 text-red-500 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              
              <button 
                onClick={(e) => { e.preventDefault(); }}
                className="flex-1 p-2.5 bg-white/95 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl transform hover:scale-105"
                title="Partajează"
              >
                <svg className="w-5 h-5 text-blue-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
