import type { InternalNavLink } from '@/lib/seo/popular-internal-links';
import {
  autoMakeSlug,
  autoModelSlug,
  buildAutoMakeHubPath,
  buildAutoModelCityHubPath,
  buildAutoModelHubPath,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
} from '@/lib/seo/auto-hub-resolve';
import { SEO_HIGHLIGHT_CITY_LABELS } from '@/lib/seo/market-paths';
import { slugifyRo } from '@/lib/seo/slug';
import type { AutoMakeInventoryRow, AutoModelCityInventoryRow, AutoModelInventoryRow } from '@/lib/seo/auto-hub-queries';
import { AUTO_HUB_INDEX_THRESHOLDS } from '@/lib/seo/sitemap-constants';

export function autoMakeLinksFromInventory(
  rows: AutoMakeInventoryRow[],
  limit = 24,
): InternalNavLink[] {
  const out: InternalNavLink[] = [];
  for (const row of rows) {
    const make = resolveAutoMakeFromSlug(autoMakeSlug(row.make)) ?? row.make;
    if (row.count < AUTO_HUB_INDEX_THRESHOLDS.make) continue;
    out.push({
      label: `${make} (${row.count})`,
      href: buildAutoMakeHubPath(make),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function autoModelLinksFromInventory(
  make: string,
  rows: AutoModelInventoryRow[],
  limit = 24,
): InternalNavLink[] {
  const out: InternalNavLink[] = [];
  for (const row of rows) {
    const model = resolveAutoModelFromSlug(make, autoModelSlug(row.model)) ?? row.model;
    if (row.count < AUTO_HUB_INDEX_THRESHOLDS.model) continue;
    out.push({
      label: `${model} (${row.count})`,
      href: buildAutoModelHubPath(make, model),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function autoModelCityLinksFromInventory(
  make: string,
  model: string,
  rows: AutoModelCityInventoryRow[],
  limit = 20,
): InternalNavLink[] {
  const out: InternalNavLink[] = [];
  for (const row of rows) {
    if (row.count < AUTO_HUB_INDEX_THRESHOLDS.modelCity) continue;
    out.push({
      label: `${row.city} (${row.count})`,
      href: buildAutoModelCityHubPath(make, model, row.city),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function autoPillarAndCityLinks(limit = 12): InternalNavLink[] {
  const links: InternalNavLink[] = [{ label: 'Auto — toată țara', href: '/auto' }];
  for (const city of SEO_HIGHLIGHT_CITY_LABELS.slice(0, limit - 1)) {
    links.push({ label: `Auto în ${city}`, href: `/auto/${slugifyRo(city)}` });
  }
  return links;
}
