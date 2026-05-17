import type { MarketHubFaqItem } from '@/lib/seo/market-hub-faq';

export function buildAutoMakeHubFaq(make: string, count: number): MarketHubFaqItem[] {
  return [
    {
      question: `Câte anunțuri ${make} sunt listate acum?`,
      answer:
        count > 0
          ? `În indexul public apar ${count} anunțuri active pentru marca ${make}, actualizate continuu pe măsură ce vânzătorii publică sau retrag anunțuri.`
          : `Momentan nu există anunțuri publice pentru ${make}; poți reveni periodic sau explora alte mărci din hub-ul auto.`,
    },
    {
      question: `Pot filtra ${make} după model și oraș?`,
      answer:
        'Da. Folosește filtrele din listă (model, oraș, preț, an) sau intră direct în paginile dedicate modelului și orașului din secțiunile de linkuri interne.',
    },
    {
      question: 'Publicarea unui anunț auto este gratuită?',
      answer:
        'Da, poți publica anunțuri auto pe ClickAnunț fără cost de listare de bază; opțiunile de promovare plătite sunt separate și opționale.',
    },
    {
      question: 'Cum evit escrocheriile la cumpărare?',
      answer:
        'Verifică mașina la fața locului, cere documente și evită avansuri către conturi necunoscute. Folosește mesageria platformei pentru a păstra conversația centralizată.',
    },
    {
      question: `De ce unele pagini ${make} nu apar în Google?`,
      answer:
        'Indexăm în sitemap doar hub-urile cu suficiente anunțuri reale; paginile cu foarte puține rezultate pot rămâne vizibile utilizatorilor, dar marcate noindex pentru motoarele de căutare.',
    },
  ];
}

export function buildAutoModelHubFaq(make: string, model: string, count: number): MarketHubFaqItem[] {
  return [
    {
      question: `Câte anunțuri ${make} ${model} există?`,
      answer:
        count > 0
          ? `Avem ${count} anunțuri ${make} ${model} active în catalogul public, sortate implicit după relevanță și actualizare.`
          : `Nu există anunțuri publice ${make} ${model} în acest moment.`,
    },
    {
      question: `Pot căuta ${make} ${model} într-un oraș anume?`,
      answer:
        'Da — vezi secțiunea cu orașe din pagină; fiecare link deschide aceeași marcă și model filtrate local.',
    },
    {
      question: 'Informațiile despre preț sunt garantate?',
      answer:
        'Prețurile sunt setate de vânzători; recomandăm confirmarea la vizionare și compararea mai multor anunțuri similare.',
    },
    {
      question: 'Pot salva anunțuri favorite?',
      answer:
        'Da, după autentificare poți salva anunțuri în cont pentru a le urmări mai ușor.',
    },
  ];
}

export function buildAutoModelCityHubFaq(
  make: string,
  model: string,
  city: string,
  count: number,
): MarketHubFaqItem[] {
  return [
    {
      question: `Câte ${make} ${model} sunt în ${city}?`,
      answer:
        count > 0
          ? `În ${city} sunt listate ${count} anunțuri ${make} ${model} în prezent.`
          : `Nu există anunțuri publice ${make} ${model} în ${city} acum.`,
    },
    {
      question: 'Pot contacta vânzătorul direct din anunț?',
      answer:
        'Da, din pagina anunțului poți trimite mesaje prin platformă; nu este necesar să expui numărul de telefon în titlu.',
    },
    {
      question: 'Anunțurile includ și mașini de firmă?',
      answer:
        'Da, în funcție de ce publică vânzătorii — verifică descrierea și întreabă despre istoricul de service și numărul de proprietari.',
    },
    {
      question: 'Ce fac dacă nu găsesc modelul dorit aici?',
      answer:
        `Extinde căutarea către alte orașe din România pentru ${make} ${model} sau revino periodic — apar anunțuri noi zilnic.`,
    },
    {
      question: 'Este sigur să plătesc un avans înainte de vizionare?',
      answer:
        'Nu recomandăm plăți în avans către persoane necunoscute; vizionează mașina și verifică actele înainte de tranzacție.',
    },
  ];
}
