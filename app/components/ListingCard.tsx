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
        className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 cursor-pointer ${
          isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section */}
        <div className="relative aspect-video bg-gray-100 overflow-hidden">
          {!imageError ? (
            <img
              src={mainPhoto}
              alt={listing.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Promoted Badge */}
          {listing.isPromoted && (
            <div className="absolute top-2 right-2">
              <PromotedBadge size="sm" />
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm">
              {listing.category}
            </span>
          </div>
          
          {/* Photo Count */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {listing.photos.length}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>

          {/* Price */}
          <div className="mb-3">
            <span className="text-2xl font-bold text-blue-600">
              {formatPrice(listing.priceAmount, listing.priceCurrency)}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-4">
              {/* Date */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formattedDate}</span>
              </div>
              
              {/* Views */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{listing.views}</span>
              </div>
            </div>
          </div>

          {/* Owner Info (if showOwner) */}
          {showOwner && listing.owner && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {(listing.owner.businessName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {listing.owner.businessName || 'Utilizator'}
                  </span>
                </div>
                <TrustBadgeCompact
                  trustScore={listing.owner.trustScore}
                  verificationLevel={listing.owner.verificationLevel}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hover Actions Bar */}
        {isHovered && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-center gap-3 opacity-0 animate-fadeIn">
            <button 
              onClick={(e) => { e.preventDefault(); /* Add to favorites */ }}
              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              title="Adaugă la favorite"
            >
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            
            <button 
              onClick={(e) => { e.preventDefault(); /* Share */ }}
              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              title="Partajează"
            >
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            
            <button 
              onClick={(e) => { e.preventDefault(); /* Contact */ }}
              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              title="Contactează"
            >
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
