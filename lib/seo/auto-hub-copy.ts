import type { HubListingStats } from '@/lib/seo/hub-queries';

export type AutoHubIntro = {
  h1: string;
  paragraphs: string[];
};

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

export function buildAutoMakeHubIntro(make: string, stats: HubListingStats | null): AutoHubIntro {
  const h1 = `Anunțuri ${make} de vânzare în România`;
  const paragraphs: string[] = [
    `Pagina dedicată mărcii ${make} adună anunțuri auto verificate din România: poți filtra după model, oraș, preț și an fără cont obligatoriu pentru navigare.`,
    `Folosește legăturile către modelele cu stoc real sau alege un oraș din hub-ul auto general dacă vrei o căutare locală rapidă.`,
  ];
  if (stats && stats.count > 0) {
    const avg = formatMoney(stats.avgPriceAmount, stats.sampleCurrency);
    paragraphs.push(
      `În acest moment sunt ${stats.count.toLocaleString('ro-RO')} anunțuri ${make} active` +
        (avg ? `, cu un preț mediu observat de circa ${avg} în selecția curentă.` : '.'),
    );
  }
  return { h1, paragraphs };
}

export function buildAutoModelHubIntro(
  make: string,
  model: string,
  stats: HubListingStats | null,
): AutoHubIntro {
  const h1 = `Anunțuri ${make} ${model} de vânzare`;
  const paragraphs: string[] = [
    `Găsești ${make} ${model} second-hand sau din flotă firme: verifici kilometrajul, dotările și istoricul direct cu vânzătorul prin mesageria ClickAnunț.`,
    `Pentru o căutare mai locală, deschide paginile pe oraș din lista de mai jos — aceeași marcă și model, filtrate geografic.`,
  ];
  if (stats && stats.count > 0) {
    paragraphs.push(
      `Catalogul public include acum ${stats.count.toLocaleString('ro-RO')} anunțuri ${make} ${model} listate pe platformă.`,
    );
  }
  return { h1, paragraphs };
}

export function buildAutoModelCityHubIntro(
  make: string,
  model: string,
  city: string,
  stats: HubListingStats | null,
): AutoHubIntro {
  const h1 = `Anunțuri ${make} ${model} în ${city}`;
  const paragraphs: string[] = [
    `Cauți ${make} ${model} în ${city}? Compari anunțuri din zonă, salvezi favoritele și discuți condițiile de vizionare în siguranță, fără comision pentru mesagerie.`,
    `Dacă nu găsești varianta potrivită aici, explorează și alte orașe din România pentru același model — linkurile interne de mai jos te duc rapid la hub-uri apropiate.`,
  ];
  if (stats && stats.count > 0) {
    const lo = formatMoney(stats.minPriceAmount, stats.sampleCurrency);
    const hi = formatMoney(stats.maxPriceAmount, stats.sampleCurrency);
    paragraphs.push(
      `Sunt ${stats.count.toLocaleString('ro-RO')} anunțuri ${make} ${model} în ${city}` +
        (lo && hi ? `, cu prețuri observate între ${lo} și ${hi}.` : '.'),
    );
  }
  return { h1, paragraphs };
}
