import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarketCategoryCityPage, {
  generateMetadata as generateCityHubMetadata,
} from '@/app/[categorySlug]/[citySlug]/page';
import { AutoHubShell } from '@/app/components/seo/AutoHubShell';
import {
  classifyAutoFirstSegmentAsync,
  resolveAutoMakeFromSlug,
  buildAutoMakeHubPath,
} from '@/lib/seo/auto-hub-resolve';
import {
  getAutoHubListingCount,
  getAutoHubListingPreviews,
  getAutoHubListingStats,
  getAutoMakesWithInventory,
  getAutoModelsWithInventory,
} from '@/lib/seo/auto-hub-queries';
import { buildAutoHubMetadata } from '@/lib/seo/hub-metadata';
import { buildAutoMakeHubIntro } from '@/lib/seo/auto-hub-copy';
import { buildAutoMakeHubFaq } from '@/lib/seo/auto-hub-faq';
import {
  autoMakeLinksFromInventory,
  autoModelLinksFromInventory,
  autoPillarAndCityLinks,
} from '@/lib/seo/auto-internal-links';

type Props = {
  params: Promise<{ makeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { makeSlug } = await params;
  const kind = await classifyAutoFirstSegmentAsync(makeSlug);
  if (kind === 'city') {
    return generateCityHubMetadata({
      params: Promise.resolve({ categorySlug: 'auto', citySlug: makeSlug }),
      searchParams,
    });
  }

  const make = resolveAutoMakeFromSlug(makeSlug);
  if (!make) {
    return buildAutoHubMetadata({
      make: makeSlug,
      count: 0,
      level: 'make',
    });
  }

  const count = await getAutoHubListingCount({ make });
  return buildAutoHubMetadata({ make, count, level: 'make' });
}

export default async function AutoMakeOrCityPage({ params, searchParams }: Props) {
  const { makeSlug } = await params;
  const kind = await classifyAutoFirstSegmentAsync(makeSlug);

  if (kind === 'city') {
    return MarketCategoryCityPage({
      params: Promise.resolve({ categorySlug: 'auto', citySlug: makeSlug }),
    });
  }

  const make = resolveAutoMakeFromSlug(makeSlug);
  if (!make) notFound();

  const count = await getAutoHubListingCount({ make });
  if (count <= 0) notFound();

  const routeBase = buildAutoMakeHubPath(make);
  const [stats, previews, allMakes, models] = await Promise.all([
    getAutoHubListingStats({ make }),
    getAutoHubListingPreviews({ make }, 24),
    getAutoMakesWithInventory(1),
    getAutoModelsWithInventory(make, 1),
  ]);

  const intro = buildAutoMakeHubIntro(make, stats);
  const faqItems = buildAutoMakeHubFaq(make, count);

  const breadcrumbs = [
    { label: 'Acasă', href: '/' },
    { label: 'Auto', href: '/auto' },
    { label: make, href: routeBase },
  ];

  return (
    <AutoHubShell
      routeBase={routeBase}
      breadcrumbs={breadcrumbs}
      intro={intro}
      initialMake={make}
      faqItems={faqItems}
      count={count}
      previews={previews}
      makeModelLinks={autoModelLinksFromInventory(make, models)}
      pillarLinks={[
        ...autoPillarAndCityLinks(8),
        ...autoMakeLinksFromInventory(allMakes, 12),
      ]}
      canonicalPath={routeBase}
    />
  );
}
