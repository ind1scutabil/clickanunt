import { ALL_CATEGORIES, ALL_CITIES, CATEGORIES } from '@/lib/carData';
import { slugifyRo } from '@/lib/seo/slug';
import { CITIES_BY_COUNTY } from '@/lib/carData';

/** Cities for SEO hubs: major list + oraș București (sectors remain in ALL_CITIES for filters). */
export const MARKETPLACE_SEO_CITIES: readonly string[] = Array.from(new Set<string>([...ALL_CITIES, 'București']));

/** First URL segment reserved by existing App Router folders or system paths. */
export const RESERVED_CATEGORY_SLUGS = new Set([
  'about',
  'admin',
  'api',
  'auth',
  'business',
  'car-catalog-demo',
  'contact',
  'dashboard',
  'favorites',
  'fonts',
  'listings',
  'messages',
  'privacy',
  'robots.txt',
  'sitemap.xml',
  'security',
  'terms',
  'test-login',
  'login',
  'register',
  'account',
  'ui-demo',
  'users',
  'sitemap-serve',
  'harta-site',
]);

/** Orașe folosite la link-uri interne (pillar / footer / hub fără context județ). */
export const SEO_HIGHLIGHT_CITY_LABELS: readonly string[] = [
  'București',
  'Cluj-Napoca',
  'Timișoara',
  'Iași',
  'Constanța',
  'Craiova',
  'Brașov',
  'Oradea',
  'Sibiu',
  'Pitești',
  'Galați',
];

/** Homepage / footer emphasis — pillar slugs aligned with CATEGORY_LABEL_BY_CANONICAL_SLUG keys. */
export const SEO_NAV_CATEGORY_SLUGS = [
  'auto',
  'imobiliare',
  'electronice',
  'locuri-de-munca',
  'servicii',
  'agricultura',
] as const;

/**
 * Canonical marketing slug → display category label (Romanian OLX-style names).
 */
export const CATEGORY_LABEL_BY_CANONICAL_SLUG: Record<string, string> = {
  auto: 'Auto, moto și ambarcațiuni',
  imobiliare: 'Imobiliare',
  electronice: 'Electronice și electrocasnice',
  moda: 'Modă și frumusețe',
  'casa-si-gradina': 'Casă și grădină',
  sport: 'Sport, timp liber și artă',
  copii: 'Copii și bebeluși',
  animale: 'Animale de companie',
  'locuri-de-munca': 'Locuri de muncă',
  servicii: 'Servicii și afaceri',
  agricultura: 'Agricultură',
  altele: 'Altele',
};

/** Alternative slugs resolving to one of the canonical keys above. */
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  telefoane: 'electronice',
  electrocasnice: 'electronice',
  casa: 'casa-si-gradina',
  gradina: 'casa-si-gradina',
  joburi: 'locuri-de-munca',
  jobs: 'locuri-de-munca',
};

const _labels = new Set(ALL_CATEGORIES);
for (const v of Object.values(CATEGORY_LABEL_BY_CANONICAL_SLUG)) {
  if (!_labels.has(v)) {
    throw new Error(`Invalid SEO category mapping: "${v}" is not in ALL_CATEGORIES`);
  }
}

/** city slug → canonical label used by filters / DB (closest match). */
const CITY_BY_SLUG: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const city of MARKETPLACE_SEO_CITIES) {
    m.set(slugifyRo(city), city);
  }
  return m;
})();

export function canonicalCategorySlug(slugRaw: string): string | null {
  const slug = slugRaw.toLowerCase();
  if (RESERVED_CATEGORY_SLUGS.has(slug)) return null;
  const primary = CATEGORY_SLUG_ALIASES[slug] ?? slug;
  return CATEGORY_LABEL_BY_CANONICAL_SLUG[primary] ? primary : null;
}

export function categorySlugToLabel(canonicalSlug: string): string | null {
  return CATEGORY_LABEL_BY_CANONICAL_SLUG[canonicalSlug] ?? null;
}

export function resolveCityLabelFromSlug(citySlug: string): string | null {
  return CITY_BY_SLUG.get(citySlug.toLowerCase()) ?? null;
}

/** Canonical slug used in URLs when multiple aliases exist. */
export function primarySlugForCategoryLabel(label: string): string | null {
  const entry = Object.entries(CATEGORY_LABEL_BY_CANONICAL_SLUG).find(([, v]) => v === label);
  return entry ? entry[0] : null;
}

export type MarketSeoIntro = {
  h1: string;
  paragraphs: string[];
};

export function buildMarketIntro(categoryLabel: string, cityLabel: string): MarketSeoIntro {
  const h1 = `Anunțuri ${categoryLabel.split(',')[0]?.trim() ?? categoryLabel} în ${cityLabel}`;
  const paragraphs = [
    `Găsești anunțuri ${categoryLabel.toLowerCase()} în ${cityLabel} pe ClickAnunț — marketplace cu publicare gratuită și căutare rapidă între orașele din România.`,
    `Actualizezi filtrele (subcategorie, preț, sortare) fără să părăsești pagina; fiecare anunț public pointează către pagina oficială cu detaliile complete.`,
  ];
  return { h1, paragraphs };
}

/** SEO copy for pillar pages (`/${slug}`, fără oraș în URL). */
export function buildNationwideMarketIntro(categoryLabel: string): MarketSeoIntro {
  const short = categoryLabel.split(',')[0]?.trim() ?? categoryLabel;
  const h1 = `Anunțuri ${short} în România`;
  const paragraphs = [
    `Explorează anunțuri ${categoryLabel.toLowerCase()} în toată țara: filtre după oraș și județ, sortare după cele mai noi și acces gratuit la mesagerie din ClickAnunț.`,
    `Pentru o căutare și mai precisă, folosește paginile pe oraș pentru fiecare categorie — aceeași navigare intuitivă, SEO optim și linkuri către orașele cu cele mai multe rezultate.`,
  ];
  return { h1, paragraphs };
}

export function siblingCitiesForMarketSeo(currentCity: string, limit: number): string[] {
  for (const cities of Object.values(CITIES_BY_COUNTY)) {
    if (cities.some((c) => c === currentCity)) {
      const sameCounty = cities.filter((c) => c !== currentCity);
      return sameCounty.slice(0, limit);
    }
  }
  return SEO_HIGHLIGHT_CITY_LABELS.filter((c) => c !== currentCity).slice(0, limit);
}

export function relatedCanonicalCategorySlugs(currentSlug: string, limit: number): string[] {
  const prioritized = [...SEO_NAV_CATEGORY_SLUGS, ...Object.keys(CATEGORY_LABEL_BY_CANONICAL_SLUG)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of prioritized) {
    if (slug === currentSlug || slug === 'altele') continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    if (!CATEGORY_LABEL_BY_CANONICAL_SLUG[slug]) continue;
    out.push(slug);
    if (out.length >= limit) break;
  }
  return out;
}

export function iterateCategoryCityLandingPaths(): Iterable<{ slug: string; citySlug: string }> {
  const out: Array<{ slug: string; citySlug: string }> = [];
  for (const slug of Object.keys(CATEGORY_LABEL_BY_CANONICAL_SLUG)) {
    if (RESERVED_CATEGORY_SLUGS.has(slug)) continue;
    for (const city of MARKETPLACE_SEO_CITIES) {
      out.push({ slug, citySlug: slugifyRo(city) });
    }
  }
  return out;
}

export function iterateAutoCityPaths(): Iterable<{ citySlug: string }> {
  return MARKETPLACE_SEO_CITIES.map((city) => ({ citySlug: slugifyRo(city) }));
}

/** Subcategories for JSON-LD / internal hints (not separate routes yet). */
export function subcategoriesFor(categoryLabel: string): string[] {
  return categoryLabel ? CATEGORIES[categoryLabel] ?? [] : [];
}
