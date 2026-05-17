import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AutoHubShell } from '@/app/components/seo/AutoHubShell';
import {
  classifyAutoFirstSegment,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
  buildAutoModelHubPath,
} from '@/lib/seo/auto-hub-resolve';
import {
  autoHubIndexMode,
  getAutoHubListingCount,
  getAutoHubListingPreviews,
  getAutoHubListingStats,
  getAutoModelCitiesWithInventory,
  getAutoModelsWithInventory,
} from '@/lib/seo/auto-hub-queries';
import { buildAutoHubMetadata } from '@/lib/seo/hub-metadata';
import { buildAutoModelHubIntro } from '@/lib/seo/auto-hub-copy';
import { buildAutoModelHubFaq } from '@/lib/seo/auto-hub-faq';
import { autoModelCityLinksFromInventory, autoModelLinksFromInventory } from '@/lib/seo/auto-internal-links';

type Props = {
  params: Promise<{ makeSlug: string; modelSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { makeSlug, modelSlug } = await params;
  if (classifyAutoFirstSegment(makeSlug) === 'city') {
    return buildAutoHubMetadata({ make: makeSlug, model: modelSlug, count: 0, level: 'model' });
  }

  const make = resolveAutoMakeFromSlug(makeSlug);
  const model = make ? resolveAutoModelFromSlug(make, modelSlug) : null;
  if (!make || !model) {
    return buildAutoHubMetadata({ make: makeSlug, model: modelSlug, count: 0, level: 'model' });
  }

  const count = await getAutoHubListingCount({ make, model });
  return buildAutoHubMetadata({ make, model, count, level: 'model' });
}

export default async function AutoModelHubPage({ params }: Props) {
  const { makeSlug, modelSlug } = await params;

  if (classifyAutoFirstSegment(makeSlug) === 'city') notFound();

  const make = resolveAutoMakeFromSlug(makeSlug);
  const model = make ? resolveAutoModelFromSlug(make, modelSlug) : null;
  if (!make || !model) notFound();

  const count = await getAutoHubListingCount({ make, model });
  if (count <= 0) notFound();

  const routeBase = buildAutoModelHubPath(make, model);
  const [stats, previews, models, cities] = await Promise.all([
    getAutoHubListingStats({ make, model }),
    getAutoHubListingPreviews({ make, model }, 24),
    getAutoModelsWithInventory(make, 1),
    getAutoModelCitiesWithInventory(make, model, 1),
  ]);

  const intro = buildAutoModelHubIntro(make, model, stats);
  const faqItems = buildAutoModelHubFaq(make, model, count);

  const breadcrumbs = [
    { label: 'Acasă', href: '/' },
    { label: 'Auto', href: '/auto' },
    { label: make, href: `/auto/${makeSlug}` },
    { label: model, href: routeBase },
  ];

  return (
    <AutoHubShell
      routeBase={routeBase}
      breadcrumbs={breadcrumbs}
      intro={intro}
      initialMake={make}
      initialModel={model}
      faqItems={faqItems}
      count={count}
      previews={previews}
      makeModelLinks={autoModelLinksFromInventory(make, models)}
      modelCityLinks={autoModelCityLinksFromInventory(make, model, cities)}
      canonicalPath={routeBase}
    />
  );
}
