import type { JSX } from 'react';

import { ListingSpecRowsView } from '@/app/components/listing/ListingSpecRowsView';
import {
  buildListingSpecRows,
  type ListingSpecSource,
} from '@/lib/listing-category-specs';
import { prisma } from '@/lib/prisma';
import { primarySlugForCategoryLabel } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';
import { isListingSeoIndexable } from '@/lib/seo/listing-seo-eligibility';

const LISTING_SPEC_SELECT = {
  category: true,
  subcategory: true,
  county: true,
  city: true,
  condition: true,
  make: true,
  model: true,
  year: true,
  mileage: true,
  fuel: true,
  transmission: true,
  vin: true,
  attributes: true,
  status: true,
  deletedAt: true,
  moderationStatus: true,
  expiresAt: true,
} as const;

function resolveCityHref(listing: ListingSpecSource): string | null {
  const categoryPillarSlug =
    typeof listing.category === 'string' ? primarySlugForCategoryLabel(listing.category) : null;
  if (categoryPillarSlug && listing.city) {
    return `/${categoryPillarSlug}/${slugifyRo(listing.city)}`;
  }
  if (listing.city && listing.category) {
    return `/listings?${new URLSearchParams({
      category: String(listing.category),
      city: listing.city,
    }).toString()}`;
  }
  return null;
}

type Props = {
  listingId: string;
  specDebug?: boolean;
};

/**
 * Server-rendered technical details for mobile web (< md).
 * Avoids client hydration / Safari compositing bugs on spec value text.
 */
export async function ListingTechnicalDetailsServer({
  listingId,
  specDebug = false,
}: Props): Promise<JSX.Element | null> {
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    return null;
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: LISTING_SPEC_SELECT,
  });

  if (!listing || !isListingSeoIndexable(listing as Parameters<typeof isListingSeoIndexable>[0])) {
    return null;
  }

  const rows = buildListingSpecRows(listing as ListingSpecSource);
  if (rows.length === 0) {
    return null;
  }

  const cityHref = resolveCityHref(listing as ListingSpecSource);

  const debugFooter = specDebug ? (
    <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/40 p-2 text-xs text-amber-100">
      <p className="mb-2 font-semibold">[spec_debug] SSR mobile — raw fields</p>
      <p>
        county={String(listing.county ?? '')} | city={String(listing.city ?? '')} | make=
        {String(listing.make ?? '')} | model={String(listing.model ?? '')}
      </p>
      <p>
        year={String(listing.year ?? '')} | mileage={String(listing.mileage ?? '')} | fuel=
        {String(listing.fuel ?? '')} | transmission={String(listing.transmission ?? '')}
      </p>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px]">
        {JSON.stringify({ rows, listing }, null, 2)}
      </pre>
    </div>
  ) : null;

  return (
    <ListingSpecRowsView
      rows={rows}
      cityHref={cityHref}
      headingId="listing-technical-details-heading-mobile"
      footer={debugFooter}
    />
  );
}
