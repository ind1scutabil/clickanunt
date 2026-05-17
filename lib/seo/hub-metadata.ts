import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import {
  buildAutoMakeHubPath,
  buildAutoModelCityHubPath,
  buildAutoModelHubPath,
} from '@/lib/seo/auto-hub-resolve';
import { autoHubIndexMode } from '@/lib/seo/auto-hub-queries';
import type { AutoHubLevel } from '@/lib/seo/sitemap-constants';

const BRAND_SUFFIX = 'ClickAnunt.ro';

function hubTitle(parts: { make: string; model?: string; city?: string }): string {
  const { make, model, city } = parts;
  if (model && city) {
    return `${make} ${model} de vânzare în ${city} | ${BRAND_SUFFIX}`;
  }
  if (model) {
    return `${make} ${model} de vânzare în România | ${BRAND_SUFFIX}`;
  }
  return `${make} de vânzare în România | ${BRAND_SUFFIX}`;
}

function hubDescription(parts: {
  make: string;
  model?: string;
  city?: string;
  count: number;
}): string {
  const { make, model, city, count } = parts;
  if (model && city) {
    return count > 0
      ? `Găsești ${count} anunțuri ${make} ${model} în ${city}: prețuri reale, filtre rapide și mesagerie gratuită pe ClickAnunț.`
      : `Nu există anunțuri publice ${make} ${model} în ${city} momentan. Revino sau explorează alte orașe.`;
  }
  if (model) {
    return count > 0
      ? `Explorează ${count} anunțuri ${make} ${model} în România — sortare după cele mai noi, poze și contact direct cu vânzătorii.`
      : `Momentan nu există anunțuri ${make} ${model} în indexul public. Încearcă alte modele sau publică gratuit.`;
  }
  return count > 0
    ? `Catalog ${make}: ${count} anunțuri auto active în România. Compară modele, filtrează după oraș și preț pe ClickAnunț.`
    : `Nu există suficiente anunțuri ${make} publice acum. Vezi alte mărci sau publică gratuit pe ClickAnunț.`;
}

function hubCanonicalPath(parts: { make: string; model?: string; city?: string }): string {
  const { make, model, city } = parts;
  if (model && city) return buildAutoModelCityHubPath(make, model, city);
  if (model) return buildAutoModelHubPath(make, model);
  return buildAutoMakeHubPath(make);
}

export function buildAutoHubMetadata(opts: {
  make: string;
  model?: string;
  city?: string;
  count: number;
  level: AutoHubLevel;
}): Metadata {
  const { make, model, city, count, level } = opts;
  const indexMode = autoHubIndexMode(count, level);
  const canonicalPath = hubCanonicalPath({ make, model, city });

  return createPageMetadata({
    title: hubTitle({ make, model, city }),
    description: hubDescription({ make, model, city, count }),
    canonicalPath,
    keywords: [make, model, city, 'auto', 'anunțuri', 'România', 'ClickAnunț'].filter(
      (k): k is string => typeof k === 'string' && k.length > 0,
    ),
    noindex: indexMode !== 'index',
    ogImage: '/images/og-default.jpg',
  });
}
