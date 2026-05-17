import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AutoHubShell } from '@/app/components/seo/AutoHubShell';
import {
  classifyAutoFirstSegment,
  resolveAutoCityFromSlug,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
  buildAutoModelCityHubPath,
} from '@/lib/seo/auto-hub-resolve';
import {
  autoHubIndexMode,
  getAutoHubListingCount,
  getAutoHubListingPreviews,
  getAutoHubListingStats,
  getAutoModelCitiesWithInventory,
} from '@/lib/seo/auto-hub-queries';
import { buildAutoHubMetadata } from '@/lib/seo/hub-metadata';
import { buildAutoModelCityHubIntro } from '@/lib/seo/auto-hub-copy';
import { buildAutoModelCityHubFaq } from '@/lib/seo/auto-hub-faq';
import { autoModelCityLinksFromInventory } from '@/lib/seo/auto-internal-links';

type Props = {
  params: Promise<{ makeSlug: string; modelSlug: string; citySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { makeSlug, modelSlug, citySlug } = await params;
  const make = resolveAutoMakeFromSlug(makeSlug);
  const model = make ? resolveAutoModelFromSlug(make, modelSlug) : null;
  const city = resolveAutoCityFromSlug(citySlug);
  if (!make || !model || !city) {
    return buildAutoHubMetadata({
      make: makeSlug,
      model: modelSlug,
      city: citySlug,
      count: 0,
      level: 'modelCity',
    });
  }

  const count = await getAutoHubListingCount({ make, model, city });
  return buildAutoHubMetadata({ make, model, city, count, level: 'modelCity' });
}

export default async function AutoModelCityHubPage({ params }: Props) {
  const { makeSlug, modelSlug, citySlug } = await params;

  if (classifyAutoFirstSegment(makeSlug) === 'city') notFound();

  const make = resolveAutoMakeFromSlug(makeSlug);
  const model = make ? resolveAutoModelFromSlug(make, modelSlug) : null;
  const city = resolveAutoCityFromSlug(citySlug);
  if (!make || !model || !city) notFound();

  const count = await getAutoHubListingCount({ make, model, city });
  if (count <= 0) notFound();

  const routeBase = buildAutoModelCityHubPath(make, model, city);
  const [stats, previews, cities] = await Promise.all([
    getAutoHubListingStats({ make, model, city }),
    getAutoHubListingPreviews({ make, model, city }, 24),
    getAutoModelCitiesWithInventory(make, model, 1),
  ]);

  const intro = buildAutoModelCityHubIntro(make, model, city, stats);
  const faqItems = buildAutoModelCityHubFaq(make, model, city, count);

  const breadcrumbs = [
    { label: 'Acasă', href: '/' },
    { label: 'Auto', href: '/auto' },
    { label: make, href: `/auto/${makeSlug}` },
    { label: model, href: `/auto/${makeSlug}/${modelSlug}` },
    { label: city, href: routeBase },
  ];

  return (
    <AutoHubShell
      routeBase={routeBase}
      breadcrumbs={breadcrumbs}
      intro={intro}
      initialMake={make}
      initialModel={model}
      initialCity={city}
      faqItems={faqItems}
      count={count}
      previews={previews}
      modelCityLinks={autoModelCityLinksFromInventory(make, model, cities)}
      canonicalPath={routeBase}
    />
  );
}
