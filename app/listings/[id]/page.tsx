import ListingDetailPageClient from '@/app/listings/[id]/ListingDetailPageClient';
import ApexToWwwRedirect from '@/app/components/ApexToWwwRedirect';
import { ListingTechnicalDetailsServer } from '@/app/components/listing/ListingTechnicalDetailsServer';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spec_debug?: string; layout_debug?: string }>;
};

export default async function ListingDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const specDebug = sp.spec_debug === '1';
  const layoutDebug = sp.layout_debug === '1';

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
      />
    </>
  );
}
