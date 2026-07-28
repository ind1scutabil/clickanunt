import { CAR_MAKES_AND_MODELS } from '@/lib/carData';
import { resolveCityLabelFromSlug } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';

export const AUTO_CATEGORY_LABEL = 'Auto, moto și ambarcațiuni';

const MAKE_BY_SLUG = new Map<string, string>(
  Object.keys(CAR_MAKES_AND_MODELS).map((make) => [slugifyRo(make), make]),
);

const MODELS_BY_MAKE_SLUG = new Map<string, Map<string, string>>(
  Object.entries(CAR_MAKES_AND_MODELS).map(([make, models]) => {
    const modelMap = new Map<string, string>();
    for (const model of models) {
      modelMap.set(slugifyRo(model), model);
    }
    return [slugifyRo(make), modelMap];
  }),
);

/** Romanian marketing slugs → catalog model names (per make slug). */
const MODEL_SLUG_ALIASES: Record<string, Record<string, string>> = {
  bmw: {
    'seria-1': '1 Series',
    'seria-2': '2 Series',
    'seria-3': '3 Series',
    'seria-4': '4 Series',
    'seria-5': '5 Series',
    'seria-6': '6 Series',
    'seria-7': '7 Series',
    'seria-8': '8 Series',
  },
  'mercedes-benz': {
    'clasa-a': 'A-Class',
    'clasa-c': 'C-Class',
    'clasa-e': 'E-Class',
    'clasa-s': 'S-Class',
  },
};

export type AutoFirstSegmentKind = 'city' | 'make' | 'unknown';

export function resolveAutoCityFromSlug(segmentSlug: string): string | null {
  return resolveCityLabelFromSlug(segmentSlug);
}

export function resolveAutoMakeFromSlug(makeSlug: string): string | null {
  const key = makeSlug.toLowerCase();
  return MAKE_BY_SLUG.get(key) ?? null;
}

export function autoMakeSlug(make: string): string {
  return slugifyRo(make);
}

export function autoModelSlug(model: string): string {
  return slugifyRo(model);
}

export function resolveAutoModelFromSlug(make: string, modelSlug: string): string | null {
  const makeKey = slugifyRo(make);
  const key = modelSlug.toLowerCase();

  const alias = MODEL_SLUG_ALIASES[makeKey]?.[key];
  if (alias) {
    const models = CAR_MAKES_AND_MODELS[make];
    if (models?.includes(alias)) return alias;
  }

  const seriaMatch = key.match(/^seria-(\d+)$/);
  if (seriaMatch && makeKey === 'bmw') {
    const candidate = `${seriaMatch[1]} Series`;
    const models = CAR_MAKES_AND_MODELS[make];
    if (models?.includes(candidate)) return candidate;
  }

  return MODELS_BY_MAKE_SLUG.get(makeKey)?.get(key) ?? null;
}

/**
 * First segment after `/auto/`: city hubs win over make when the slug is a known city.
 */
export function classifyAutoFirstSegment(segmentSlug: string): AutoFirstSegmentKind {
  const slug = segmentSlug.toLowerCase();
  if (resolveAutoCityFromSlug(slug)) return 'city';
  if (resolveAutoMakeFromSlug(slug)) return 'make';
  return 'unknown';
}

/**
 * Same classification, but also checks real DB cities beyond the static
 * allowlist before giving up (see `resolveCityLabelForHub` in `hub-queries.ts`)
 * — a city published outside the standard picker should still resolve to a
 * hub instead of being misclassified as an unknown make.
 *
 * `resolveDbCity` is injectable so tests can bypass `unstable_cache`;
 * production call sites always use the default (cached) resolver.
 */
export async function classifyAutoFirstSegmentAsync(
  segmentSlug: string,
  resolveDbCity?: (slug: string) => Promise<string | null>,
): Promise<AutoFirstSegmentKind> {
  const slug = segmentSlug.toLowerCase();
  // Static city allowlist still wins over make, same precedence as the sync classifier.
  if (resolveAutoCityFromSlug(slug)) return 'city';
  if (resolveAutoMakeFromSlug(slug)) return 'make';
  // Lazy import avoids a static prisma dependency for callers that only need the sync classifier.
  const resolve =
    resolveDbCity ??
    (async (s: string) => {
      const { resolveCityLabelForHub } = await import('@/lib/seo/hub-queries');
      return resolveCityLabelForHub(s);
    });
  const city = await resolve(slug);
  if (city) return 'city';
  return 'unknown';
}

export function buildAutoMakeHubPath(make: string): string {
  return `/auto/${autoMakeSlug(make)}`;
}

export function buildAutoModelHubPath(make: string, model: string): string {
  return `/auto/${autoMakeSlug(make)}/${autoModelSlug(model)}`;
}

export function buildAutoModelCityHubPath(make: string, model: string, city: string): string {
  return `/auto/${autoMakeSlug(make)}/${autoModelSlug(model)}/${slugifyRo(city)}`;
}
