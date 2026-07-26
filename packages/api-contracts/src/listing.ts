import type { IsoDateTimeString, ListingsCursorPagination, PriceFields } from './common';

/** Public owner block — no account email / phones / role. */
export type PublicListingOwnerDto = {
  id: string;
  name?: string | null;
  businessName?: string | null;
  avatar?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  trustScore?: number;
  totalSales?: number;
  averageRating?: number;
  totalListings?: number;
  responseRate?: number;
  createdAt?: IsoDateTimeString;
};

/**
 * Anonymous / non-owner listing JSON (allowlist).
 * Must stay aligned with `PUBLIC_LISTING_KEYS` in lib/listings/public-listing-dto.ts.
 */
export type PublicListingDto = PriceFields & {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  condition?: string | null;
  photos: string[];
  county?: string | null;
  city?: string | null;
  /** Intentional public listing contact — harvestable by design. */
  contactPhone?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  vin?: string | null;
  attributes?: Record<string, unknown> | null;
  status: string;
  views: number;
  isFeatured: boolean;
  isPromoted: boolean;
  createdAt: IsoDateTimeString;
  expiresAt?: IsoDateTimeString | null;
  owner?: PublicListingOwnerDto | null;
};

/** Owner summary on authenticated owner/admin feed rows. */
export type ListingOwnerFeedDto = {
  id: string;
  email: string;
  role: string;
  createdAt: IsoDateTimeString;
  subscriptionTier?: string;
  trustScore?: number;
};

/** Owner block on authenticated GET /api/listings/:id for owner/admin. */
export type ListingOwnerDetailDto = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  businessPhone: string | null;
  businessName: string | null;
  avatar: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  trustScore: number;
  totalSales: number;
  averageRating: number;
  role: string;
  createdAt: IsoDateTimeString;
};

/**
 * Owner/admin listing payload (pass-through / tools).
 * Includes fields stripped from {@link PublicListingDto}.
 */
export type OwnerAdminListingDto = PriceFields & {
  id: string;
  ownerUserId: string;
  title: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  condition?: string | null;
  photos: string[];
  county?: string | null;
  city?: string | null;
  region?: string | null;
  contactPhone?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  vin?: string | null;
  isDealer?: boolean;
  dealerBrands?: string[];
  dealerPriceMin?: number | null;
  dealerPriceMax?: number | null;
  attributes?: Record<string, unknown> | null;
  status: string;
  views: number;
  isFeatured: boolean;
  feedBoost: number;
  isPromoted: boolean;
  promotionType?: string | null;
  promotionExpiresAt?: IsoDateTimeString | null;
  promotionStartedAt?: IsoDateTimeString | null;
  scamScore?: number;
  scamFlags?: string[];
  isScamSuspected?: boolean;
  isDuplicate?: boolean;
  duplicateOfId?: string | null;
  moderationStatus?: string;
  moderatedAt?: IsoDateTimeString | null;
  moderatedBy?: string | null;
  moderationNotes?: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  publishedAt?: IsoDateTimeString | null;
  expiresAt?: IsoDateTimeString | null;
  deletedAt?: IsoDateTimeString | null;
  owner?: ListingOwnerFeedDto | ListingOwnerDetailDto;
};

/**
 * @deprecated Use {@link PublicListingDto} for anonymous responses.
 * Kept as alias so older imports compile; does NOT include ownerUserId.
 */
export type ListingPublicDto = PublicListingDto;

/**
 * GET /api/listings — public feed envelope.
 */
export type ListingsFeedResponse = {
  data: PublicListingDto[];
  pagination: ListingsCursorPagination & {
    page?: number;
    usedOffset?: boolean;
  };
};

/** Authenticated owner/admin feed (`userId=me` / admin scope). */
export type OwnerAdminListingsFeedResponse = {
  data: OwnerAdminListingDto[];
  pagination: ListingsCursorPagination & {
    page?: number;
    usedOffset?: boolean;
  };
};

/**
 * POST /api/listings — 201 body is the created listing record (see route).
 * PATCH /api/listings/:id — updated listing record (owner/admin).
 */
export type ListingMutationResponse = OwnerAdminListingDto;

/**
 * Client create/update body — mirrors `listingCreateSchema` / `listingEditSchema` (zod) in lib/security/validation-schemas.ts.
 * Do not add fields here that the backend does not validate.
 */
export type ListingCreateBodyDto = {
  title: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  priceAmount: number;
  priceCurrency: 'RON' | 'EUR' | 'USD';
  condition?: 'new' | 'used' | 'refurbished' | 'for_parts' | null;
  year?: number | null;
  mileage?: number | null;
  /** Required on create (server listingCreateSchema). */
  city: string;
  /** Required on create (server listingCreateSchema). */
  county: string;
  photos: string[];
  /** Not supported — send → 400 from strict create schema. */
  contactPhone?: string | null;
  allowMessages?: boolean;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  fuel?: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'gas' | null;
  transmission?: 'manual' | 'automatic' | null;
  accidents?: 'no' | 'minor' | 'major' | null;
  rare?: boolean;
  horsepower?: number | null;
  cylinderCapacity?: number | null;
  bodyType?: string | null;
  color?: string | null;
  seatCount?: number | null;
  doorCount?: number | null;
  owners?: number | null;
  keys?: number | null;
  registrationDate?: string | null;
  inspectionExpires?: string | null;
  countryOfOrigin?: string | null;
  /** Category-specific JSON attributes (taxonomy AttributeFieldDef keys). */
  attributes?: Record<string, unknown>;
  uploadSessionId?: string;
};

export type ListingPatchBodyDto = Partial<ListingCreateBodyDto> & {
  status?: string;
};
