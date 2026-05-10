import type { HubListingStats } from '@/lib/seo/hub-queries';

function formatMoney(amount: number | null, currency: string): string | null {
  if (amount == null || Number.isNaN(amount)) return null;
  const major = Math.round(amount);
  try {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'RON',
      maximumFractionDigits: major > 1000 ? 0 : 2,
    }).format(major);
  } catch {
    return `${major.toLocaleString('ro-RO')} ${currency}`;
  }
}

/**
 * Extra human-readable copy for hubs — varies by category/city and real aggregates.
 * Keep paragraphs short to avoid thin/duplicate spam signals.
 */
export function buildProgrammaticHubParagraphs(opts: {
  categoryLabel: string;
  cityLabel?: string;
  stats: HubListingStats | null;
}): string[] {
  const { categoryLabel, cityLabel, stats } = opts;
  const short = categoryLabel.split(',')[0]?.trim() ?? categoryLabel;
  const catLower = categoryLabel.toLowerCase();
  const out: string[] = [];

  if (stats && stats.count > 0) {
    const avg = formatMoney(stats.avgPriceAmount, stats.sampleCurrency);
    const lo = formatMoney(stats.minPriceAmount, stats.sampleCurrency);
    const hi = formatMoney(stats.maxPriceAmount, stats.sampleCurrency);
    if (cityLabel) {
      out.push(
        `În ${cityLabel}, catalogul ClickAnunț include aproximativ ${stats.count.toLocaleString('ro-RO')} anunțuri publice ${catLower}.` +
          (avg ? ` Prețul mediu observat în această selecție este ${avg}` : '') +
          (lo && hi ? `; intervalul uzual se situează între ${lo} și ${hi}.` : '.'),
      );
    } else {
      out.push(
        `La nivel național, categoria «${short}» are acum ${stats.count.toLocaleString('ro-RO')} anunțuri active verificate în indexul public.` +
          (avg ? ` Media prețurilor din eșantion este ${avg}.` : ''),
      );
    }
  }

  if (cityLabel) {
    out.push(
      `Pentru cumpărători: compară mai multe anunțuri ${catLower} în ${cityLabel}, cere poze suplimentare prin mesagerie și evită plata în avans către conturi necunoscute.`,
    );
    out.push(
      `Pentru vânzători: descrieri clare și fotografii bune cresc încrederea; actualizezi anunțul periodic ca să rămână relevant în căutări.`,
    );
  } else {
    out.push(
      `Folosește hub-urile pe oraș pentru ${short} — aceeași categorie, dar filtrată local, cu legături interne către marile centre din România.`,
    );
  }

  return out;
}
