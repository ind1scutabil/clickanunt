/**
 * Short Romanian FAQ blocks for category / city SEO hubs.
 * Kept generic (no fake listing claims) — safe for thin pages when paired with noindex.
 */

export type MarketHubFaqItem = { question: string; answer: string };

export function buildMarketHubFaqItems(categoryLabel: string, cityLabel?: string): MarketHubFaqItem[] {
  const short = categoryLabel.split(",")[0]?.trim() ?? categoryLabel;
  const catLower = categoryLabel.toLowerCase();

  if (cityLabel) {
    return [
      {
        question: `Cum găsesc anunțuri ${catLower} în ${cityLabel}?`,
        answer: `Folosești filtrele de pe această pagină pentru ${short} în ${cityLabel}: sortare după cele mai noi, subcategorie și interval de preț. Fiecare anunț are pagină dedicată cu poze și date de contact.`,
      },
      {
        question: `Publicarea unui anunț ${short} în ${cityLabel} este gratuită?`,
        answer:
          "Da — poți publica gratuit pe ClickAnunț. Opțional poți promova anunțul pentru vizibilitate mai mare; detaliile apar în fluxul de promovare din cont.",
      },
      {
        question: "Cum evit escrocheriile când cumpăr local?",
        answer:
          "Verifică produsul înainte de plată, evită avansuri către necunoscuți, cere factură/bon când e cazul și folosește mesageria din platformă pentru o urmă a conversației.",
      },
      {
        question: `Ce fac dacă nu găsesc suficiente anunțuri ${catLower} în ${cityLabel}?`,
        answer: `Încearcă orașe din același județ sau revenim periodic — catalogul se actualizează. Poți și salva căutarea sau extinde filtrele către toată România pentru categoria ${short}.`,
      },
    ];
  }

  return [
    {
      question: `Ce anunțuri ${catLower} pot publica pe ClickAnunț?`,
      answer: `Poți publica anunțuri pentru categoria «${categoryLabel}», respectând regulile platformei și legislația în vigoare. Anunțurile trec prin moderare înainte de a fi vizibile public.`,
    },
    {
      question: "Cum caut pe oraș sau județ?",
      answer: `Din pagina categoriei accesezi hub-urile pe oraș (ex.: ${short} în București, Cluj-Napoca, Timișoara) sau folosești lista de anunțuri cu filtre de locație.`,
    },
    {
      question: "Este gratuit să public un anunț?",
      answer:
        "Publicarea de bază este gratuită. Promovările opționale sunt separate și transparente în contul tău.",
    },
    {
      question: "Cum raportez un anunț suspect?",
      answer:
        "Pe pagina anunțului poți folosi opțiunea de raportare; echipa de moderare analizează semnalările în funcție de politicile platformei.",
    },
  ];
}
