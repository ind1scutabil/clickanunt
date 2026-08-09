import { notFound } from 'next/navigation';
import ListingDetailPageClient from '@/app/listings/[id]/ListingDetailPageClient';
import ApexToWwwRedirect from '@/app/components/ApexToWwwRedirect';
import { ListingTechnicalDetailsServer } from '@/app/components/listing/ListingTechnicalDetailsServer';
import { canRenderListingDetailHtml } from '@/lib/listings/listing-detail-html-access';
import {
  getPublicListingDetailForSsr,
  getSimilarListingsForSsr,
} from '@/lib/listings/public-listing-detail-ssr';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spec_debug?: string; layout_debug?: string }>;
};

export default async function ListingDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const specDebug = sp.spec_debug === '1';
  const layoutDebug = sp.layout_debug === '1';

  const initialListing = await getPublicListingDetailForSsr(id);
  // Anonymous non-indexable / missing → real HTTP 404 (same gate as GET /api/listings/[id]).
  // Owner/admin of a non-public listing still get the HTML shell (client loads via API).
  if (!initialListing && !(await canRenderListingDetailHtml(id))) {
    notFound();
  }

  const initialSimilar =
    initialListing && typeof initialListing.category === 'string'
      ? await getSimilarListingsForSsr({
          listingId: id,
          category: initialListing.category,
          make: typeof initialListing.make === 'string' ? initialListing.make : null,
          model: typeof initialListing.model === 'string' ? initialListing.model : null,
        })
      : [];

  const mobileTechnicalDetails =
    process.env.USE_IN_MEMORY_DB === 'true'
      ? null
      : await ListingTechnicalDetailsServer({ listingId: id, specDebug });

  return (
    <>
      <ApexToWwwRedirect />
      <ListingDetailPageClient
        id={id}
        mobileTechnicalDetails={mobileTechnicalDetails}
        layoutDebug={layoutDebug}
        initialListing={initialListing}
        initialSimilarListings={initialSimilar}
      />
    </>
  );
}
