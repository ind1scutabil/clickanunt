import type { IsoDateTimeString, ListingsCursorPagination, PriceFields } from './common';

/** Owner summary on listing feed rows (GET /api/listings include.owner select). */
export type ListingOwnerFeedDto = {
  id: string;
  email: string;
  role: string;
  createdAt: IsoDateTimeString;
  subscriptionTier?: string;
  trustScore?: number;
};

/** Owner block on GET /api/listings/:id */
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
 * Listing as serialized JSON from the API (Prisma model + relations).
 * Dates are ISO strings over the wire.
 */
export type ListingPublicDto = PriceFields & {
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
 * GET /api/listings — canonical feed envelope (`buildPagination` + extra pagination fields).
 */
export type ListingsFeedResponse = {
  data: ListingPublicDto[];
  pagination: ListingsCursorPagination & {
    page?: number;
    usedOffset?: boolean;
  };
};

/**
 * POST /api/listings — 201 body is the created listing record (see route).
 * PATCH /api/listings/:id — updated listing record.
 */
export type ListingMutationResponse = ListingPublicDto;

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
  city?: string | null;
  county?: string | null;
  photos: string[];
  video?: string | null;
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
};

export type ListingPatchBodyDto = Partial<ListingCreateBodyDto> & {
  status?: string;
};
