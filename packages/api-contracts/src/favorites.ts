import type { IsoDateTimeString } from './common';

/**
 * Slim listing fields embedded in GET /api/favorites (see app/api/favorites/route.ts select).
 */
export type FavoriteListingSlimDto = {
  id: string;
  title: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  photos: string[];
  city: string | null;
  county: string | null;
  category: string;
  subcategory: string | null;
  views: number;
  isFeatured: boolean;
  condition: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  status: string;
  createdAt: IsoDateTimeString;
  owner: {
    id: string;
    email: string;
    name: string | null;
    businessName: string | null;
  };
};

/**
 * GET /api/favorites — each row is a Favorite + nested listing.
 */
export type FavoriteWithListingDto = {
  id: string;
  userId: string;
  listingId: string;
  listing: FavoriteListingSlimDto;
  createdAt: IsoDateTimeString;
};

export type FavoritesListResponseDto = {
  favorites: FavoriteWithListingDto[];
};
