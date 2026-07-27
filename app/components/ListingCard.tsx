'use client';

import React, { useState, useEffect, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import { normalizeListingPhotosArray } from '@/lib/listing-photo-url';
import {
  applyListingImageFallback,
  listingPrimaryPhotoSrcForVariant,
} from '@/lib/listing-image-variants';
import { resolveClientApiUrl } from '@/lib/client-canonical-www';
import { TrustBadgeCompact } from '@/app/components/TrustBadge';
import PromotedBadge from '@/app/components/PromotedBadge';
import { ListingCategoryPhotoFallback } from '@/app/components/listing/ListingCategoryPhotoFallback';
import { formatListingCommercialOrSalaryLine } from '@/lib/format-listing-price';
import { isFavoriteLocal, toggleFavoriteListing } from '@/lib/favorites-client';

const motionEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

const pillBase =
  'inline-flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.07] px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.16em] text-zinc-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md sm:px-2 sm:text-[7px]';

const cardShellInk =
  'group/card relative flex h-full max-w-full flex-col overflow-hidden rounded-2xl border border-white/[0.055] bg-gradient-to-b from-white/[0.045] to-[rgb(14,16,22)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_48px_-32px_rgba(0,0,0,0.85)] transition-[transform,box-shadow,border-color] duration-300 motion-reduce:transition-none';

const cardHoverInk =
  'max-md:active:scale-[0.998] hover:-translate-y-px hover:border-white/[0.085] hover:shadow-[0_1px_0_rgba(255,255,255,0.055)_inset,0_22px_56px_-28px_rgba(0,0,0,0.88)] motion-reduce:hover:translate-y-0';

const cardShellPaper =
  'group/card relative flex h-full max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-16px_rgba(15,23,42,0.18)] transition-[transform,box-shadow,border-color] duration-300 motion-reduce:transition-none';

const cardHoverPaper =
  'hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] motion-reduce:hover:translate-y-0';

export interface ListingCardListing {
  id: string;
  title: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  category: string;
  photos: string[];
  createdAt: string;
  status: string;
  isPromoted: boolean;
  promotionExpiresAt?: string | null;
  views: number;
  city?: string | null;
  county?: string | null;
  attributes?: Record<string, unknown> | null;
  priceType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  owner?: {
    id: string;
    businessName?: string;
    trustScore: number;
    verificationLevel?: 'none' | 'email' | 'phone' | 'business';
  };
}

interface ListingCardProps {
  listing: ListingCardListing;
  showOwner?: boolean;
  /** Local “salvare” pentru reconectare rapidă cu favoritele din cont */
  showFavorite?: boolean;
  /** Dark glass marketplace (default) vs light catalog */
  appearance?: 'ink' | 'paper';
  /** Narrow grids: hero strip, recently viewed */
  compact?: boolean;
  /** Homepage discover rails — refined “Hot azi” */
  hotToday?: boolean;
  /** Show date + views row */
  showMetaRow?: boolean;
  /** First visible row / LCP — eager load + fetch priority */
  imagePriority?: boolean;
}

export function ListingCard({
  listing,
  showOwner = false,
  showFavorite = true,
  appearance = 'ink',
  compact = false,
  hotToday = false,
  showMetaRow = true,
  imagePriority = false,
}: ListingCardProps) {
  const [formattedDate, setFormattedDate] = useState<string>('—');
  const [isNew, setIsNew] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const date = new Date(listing.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let result: string;
    if (diffDays === 0) result = 'Astăzi';
    else if (diffDays === 1) result = 'Ieri';
    else if (diffDays < 7) result = `Acum ${diffDays} zile`;
    else if (diffDays < 30) result = `Acum ${Math.floor(diffDays / 7)} săpt.`;
    else if (diffDays < 365) result = `Acum ${Math.floor(diffDays / 30)} luni`;
    else result = date.toLocaleDateString('ro-RO');

    setFormattedDate(result);

    const createdMs = date.getTime();
    setIsNew(Number.isFinite(createdMs) && Date.now() - createdMs < 7 * 86400000);
  }, [listing.createdAt]);

  useEffect(() => {
    setSaved(isFavoriteLocal(listing.id));
  }, [listing.id]);

  useEffect(() => {
    setImgLoaded(false);
    const el = imgRef.current;
    // FIX: cached images may not fire onLoad — bypass opacity-0 fade for already-complete imgs
    if (el?.complete && el.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [listing.id, listing.photos]);

  const handleFav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = saved;
    setSaved(!prev);
    void toggleFavoriteListing(listing.id).then((result) => {
      if (result.error && !result.needsAuth) {
        setSaved(prev);
        return;
      }
      setSaved(result.saved);
    });
  };

  const promotedLive =
    Boolean(listing.isPromoted) &&
    (listing.promotionExpiresAt == null ||
      listing.promotionExpiresAt === '' ||
      new Date(listing.promotionExpiresAt).getTime() > Date.now());

  // Price formatting: lib/format-listing-price (single currency code).

  const photos = normalizeListingPhotosArray(listing.photos);
  const hasRealPhoto = photos.length > 0;
  const mainPhoto = hasRealPhoto
    ? listingPrimaryPhotoSrcForVariant(listing.photos, 'medium')
    : '';
  const mainPhotoRaw = photos[0] ?? '';
  const displayPhoto =
    mainPhoto && mainPhoto.startsWith('/api/') ? resolveClientApiUrl(mainPhoto) : mainPhoto;
  const locationLabel = [listing.city, listing.county].filter(Boolean).join(' · ');
  const verifiedSeller =
    typeof listing.owner?.trustScore === 'number' && listing.owner.trustScore >= 70;

  const href = `/listings/${listing.id}`;
  const ink = appearance === 'ink';

  const bodyPad = compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3 md:p-3.5';
  const titleClass = ink
    ? `line-clamp-2 font-semibold tracking-[-0.02em] text-zinc-50 ${compact ? 'text-[11px] leading-snug sm:text-[12px]' : 'text-[12px] leading-snug sm:text-[13px] md:text-[14px]'}`
    : `line-clamp-2 font-semibold tracking-tight text-slate-900 ${compact ? 'text-[11px] leading-snug sm:text-[12px]' : 'text-[12px] sm:text-[13px] md:text-[14px]'}`;

  const locationClass = ink
    ? `line-clamp-1 ${compact ? 'mt-0.5 text-[9px] text-zinc-500/75 sm:text-[10px]' : 'mt-1 text-[10px] text-zinc-500/70 sm:text-[11px]'}`
    : `line-clamp-1 ${compact ? 'mt-0.5 text-[9px] text-slate-500 sm:text-[10px]' : 'mt-1 text-[10px] text-slate-600 sm:text-[11px]'}`;

  const priceClass = ink
    ? `font-semibold tabular-nums tracking-tight text-white ${compact ? 'mt-1.5 text-[13px] sm:text-sm' : 'mt-2 text-[0.9375rem] sm:text-[1.0625rem]'}`
    : `font-semibold tabular-nums tracking-tight text-slate-900 ${compact ? 'mt-1.5 text-[13px] sm:text-sm' : 'mt-2 text-base sm:text-[1.0625rem]'}`;

  const imageAreaBg = ink
    ? 'bg-[#22262f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
    : 'bg-slate-100 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]';

  const scrimClass = ink
    ? 'pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080c]/88 via-[#07080c]/20 to-white/[0.04]'
    : 'pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-white/30';

  return (
    <div
      className={ink ? `${cardShellInk} ${cardHoverInk}` : `${cardShellPaper} ${cardHoverPaper}`}
      style={{ transitionTimingFunction: motionEase }}
    >
      <div className={`relative aspect-[5/3] w-full overflow-hidden ${imageAreaBg}`}>
        <Link
          href={href}
          className={`relative block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
            ink ? 'focus-visible:ring-orange-500/35' : 'focus-visible:ring-blue-500/40'
          }`}
          prefetch={false}
        >
          {hasRealPhoto ? (
            <img
              ref={imgRef}
              src={displayPhoto}
              alt={listing.title}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`h-full w-full object-cover transition-[transform,opacity] duration-500 motion-reduce:transition-none ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              } group-hover/card:scale-[1.012] motion-reduce:group-hover/card:scale-100`}
              style={{ transitionTimingFunction: motionEase }}
              onError={(e) => {
                if (!mainPhotoRaw) return;
                applyListingImageFallback(e.currentTarget, mainPhotoRaw, 'medium');
                // FIX: show fallback immediately if load fails — do not stay on opacity-0
                setImgLoaded(true);
              }}
              onLoad={() => setImgLoaded(true)}
              loading={imagePriority ? 'eager' : 'lazy'}
              decoding="async"
              {...(imagePriority ? { fetchPriority: 'high' as const } : {})}
            />
          ) : (
            <ListingCategoryPhotoFallback category={listing.category} compact={compact} appearance={ink ? 'ink' : 'paper'} />
          )}
        </Link>

        <div className={scrimClass} aria-hidden />

        <div className="pointer-events-none absolute left-2 top-2 z-[2] flex max-w-[calc(100%-5.5rem)] flex-wrap items-center gap-1 sm:left-2.5 sm:top-2.5 sm:max-w-[calc(100%-6rem)]">
          {hotToday ? (
            <span className={pillBase}>
              <span className="h-1 w-1 rounded-full bg-amber-200/55" aria-hidden />
              Hot azi
            </span>
          ) : null}
          {isNew ? (
            <span className={pillBase}>
              <span className="h-1 w-1 rounded-full bg-emerald-300/45" aria-hidden />
              Nou
            </span>
          ) : null}
          {verifiedSeller ? (
            <span className={pillBase}>
              <svg className="h-2.5 w-2.5 text-zinc-300/90" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verificat
            </span>
          ) : null}
          {listing.status === 'active' ? (
            <span className={pillBase}>
              <span className="h-1 w-1 rounded-full bg-emerald-400/35" aria-hidden />
              Live
            </span>
          ) : null}
        </div>

        <div className="absolute right-2 top-2 z-[3] flex items-center gap-1.5 sm:right-2.5 sm:top-2.5">
          {promotedLive ? <PromotedBadge size="xs" tone="glassDark" /> : null}
          {showFavorite ? (
            <button
              type="button"
              title={saved ? 'Elimină din salvate' : 'Salvează anunțul'}
              aria-label={saved ? 'Elimină din salvate' : 'Salvează anunțul'}
              aria-pressed={saved}
              className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-[transform,background-color,border-color,color,box-shadow] duration-300 motion-reduce:transition-none active:scale-[0.97] ${
                ink
                  ? 'border-white/[0.1] bg-[rgba(12,14,18,0.45)] text-zinc-300 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] hover:border-white/[0.14] hover:bg-[rgba(18,20,26,0.55)] hover:text-white hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.65)]'
                  : 'border-slate-200/90 bg-white/90 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-rose-500 hover:shadow-md'
              }`}
              style={{ transitionTimingFunction: motionEase }}
              onClick={handleFav}
            >
              <svg
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="pointer-events-none absolute bottom-2 left-2 z-[2] max-w-[min(100%-4.5rem,11rem)] sm:bottom-2.5 sm:left-2.5 sm:max-w-[min(100%-5rem,13rem)]">
          <span
            className={`line-clamp-1 rounded-full border px-2 py-0.5 text-[8px] font-medium tracking-tight backdrop-blur-md sm:text-[9px] ${
              ink
                ? 'border-white/[0.08] bg-black/35 text-zinc-100/90'
                : 'border-slate-200/80 bg-white/85 text-slate-800'
            }`}
          >
            {listing.category}
          </span>
        </div>

        {photos.length > 1 ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-[2] sm:bottom-2.5 sm:right-2.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[8px] font-medium tabular-nums backdrop-blur-md sm:gap-1 sm:px-2 sm:text-[9px] ${
                ink
                  ? 'border-white/[0.08] bg-black/35 text-zinc-100'
                  : 'border-slate-200/80 bg-white/90 text-slate-700'
              }`}
            >
              <svg className="h-3 w-3 opacity-80" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
              {photos.length}
            </span>
          </div>
        ) : null}
      </div>

      <Link
        href={href}
        prefetch={false}
        className={`flex min-h-0 max-w-full flex-1 flex-col ${bodyPad} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
          ink ? 'focus-visible:ring-orange-500/25' : 'focus-visible:ring-blue-500/30'
        }`}
      >
        <h3 className={titleClass}>{listing.title}</h3>

        {locationLabel ? <p className={locationClass}>{locationLabel}</p> : null}

        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          {(() => {
            const line = formatListingCommercialOrSalaryLine({
              category: listing.category,
              priceType: listing.priceType,
              priceAmount: listing.priceAmount,
              priceCurrency: listing.priceCurrency,
              salaryMin: listing.salaryMin,
              salaryMax: listing.salaryMax,
              salaryCurrency: listing.salaryCurrency,
              salaryPeriod: listing.salaryPeriod,
              legacySalaryRange:
                typeof listing.attributes?.salary_range === 'string'
                  ? listing.attributes.salary_range
                  : null,
            });
            return (
              <>
                <span className={priceClass}>{line.primary}</span>
                {line.suffix ? (
                  <span className="text-[10px] font-medium opacity-70 sm:text-xs">{line.suffix}</span>
                ) : null}
              </>
            );
          })()}
        </div>

        {showMetaRow ? (
          <div
            className={`mt-auto flex flex-wrap items-center gap-1 border-t pt-2 sm:gap-1.5 sm:pt-2.5 ${
              ink ? 'border-white/[0.055]' : 'border-slate-100'
            }`}
          >
            <div
              className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 sm:px-2 sm:py-1 ${
                ink
                  ? 'border-white/[0.06] bg-white/[0.03] text-zinc-500/80'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <svg className="h-2.5 w-2.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] font-medium sm:text-[10px]">{formattedDate}</span>
            </div>
            <div
              className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 sm:px-2 sm:py-1 ${
                ink
                  ? 'border-white/[0.06] bg-white/[0.03] text-zinc-500/80'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <svg className="h-2.5 w-2.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-[9px] font-medium tabular-nums sm:text-[10px]">{listing.views}</span>
              <span className="sr-only">vizualizări</span>
            </div>
          </div>
        ) : null}

        {showOwner && listing.owner ? (
          <div className={`mt-2 border-t pt-2 sm:mt-2.5 sm:pt-2.5 ${ink ? 'border-white/[0.055]' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    ink
                      ? 'border-white/[0.08] bg-zinc-800/80 text-zinc-100'
                      : 'border-slate-200 bg-slate-100 text-slate-800'
                  }`}
                >
                  {(listing.owner.businessName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-medium ${ink ? 'text-zinc-500' : 'text-slate-500'}`}>Vânzător</span>
                  <span className={`block truncate text-sm font-semibold ${ink ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {listing.owner.businessName || 'Utilizator'}
                  </span>
                </div>
              </div>
              <TrustBadgeCompact
                trustScore={listing.owner.trustScore ?? 0}
                verificationLevel={listing.owner.verificationLevel ?? 'none'}
              />
            </div>
          </div>
        ) : null}
      </Link>
    </div>
  );
}
