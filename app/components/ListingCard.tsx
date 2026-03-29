'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  listingPrimaryPhotoSrc,
  LISTING_PHOTO_ONERROR_FALLBACK,
  normalizeListingPhotosArray,
} from '@/lib/listing-photo-url';
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

  const photos = normalizeListingPhotosArray(listing.photos);
  const mainPhoto = listingPrimaryPhotoSrc(listing.photos);

  return (
    <Link href={`/listings/${listing.id}`}>
      <div
        className={`group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md transition-all duration-normal ease-premium motion-reduce:transition-none hover:-translate-y-2 hover:border-primary-400/80 hover:shadow-2xl motion-reduce:hover:translate-y-0 ${
          isHovered ? "ring-2 ring-primary-500/35" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <img
            src={mainPhoto}
            alt={listing.title}
            className={`h-full w-full object-cover transition-transform duration-normal ease-premium ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
            onError={(e) => {
              const el = e.currentTarget;
              el.onerror = null;
              el.src = LISTING_PHOTO_ONERROR_FALLBACK;
            }}
            loading="lazy"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-normal ease-premium group-hover:opacity-100" />
          
          {/* Status Badge */}
          {listing.status === 'active' && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center rounded-md border border-emerald-600/30 bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-100">
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
            <span className="inline-flex items-center rounded-md border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-sm backdrop-blur-sm">
              {listing.category}
            </span>
          </div>
          
          {/* Photo Count */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm shadow-md hover:bg-black/80 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {photos.length}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col h-full">
          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-base font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-primary-700">
            {listing.title}
          </h3>

          {/* Price - PROMINENT */}
          <div className="mb-4 flex items-baseline gap-2">
            <span className="bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-3xl font-bold text-transparent tabular-nums">
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
            <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1">
              <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-medium text-neutral-800 tabular-nums">{listing.views}</span>
            </div>
          </div>

          {/* Owner Info (if showOwner) */}
          {showOwner && listing.owner && (
            <div className="mt-auto pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-500/20 bg-primary-600 text-xs font-semibold text-white shadow-sm">
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
          <div className="animate-fadeIn absolute inset-0 flex flex-col items-center justify-end gap-2 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-4">
            <button
              onClick={(e) => {
                e.preventDefault();
              }}
              className="w-full rounded-lg border border-white/10 bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-500"
              title="Vezi detalii"
              type="button"
            >
              Vezi detalii
            </button>
            <div className="flex w-full gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="flex-1 rounded-lg border border-white/20 bg-white/95 p-2.5 shadow-sm transition hover:bg-white"
                title="Adaugă la favorite"
                type="button"
              >
                <svg className="mx-auto h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="flex-1 rounded-lg border border-white/20 bg-white/95 p-2.5 shadow-sm transition hover:bg-white"
                title="Partajează"
                type="button"
              >
                <svg className="mx-auto h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
