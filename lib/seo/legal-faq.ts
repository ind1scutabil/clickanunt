/**
 * Factual FAQ content for specific legal/trust pages.
 *
 * Each item is policy-based and drawn 1:1 from content already visible on the
 * respective page. These arrays are the SINGLE source for both the visible
 * FAQ section and the FAQPage JSON-LD, guaranteeing the structured data matches
 * the on-page text exactly. No fabricated stats, ratings, guarantees or claims.
 */

import type { FaqJsonLdItem } from '@/lib/seo/faq-jsonld';

/** /gdpr — exercising GDPR rights (matches visible policy on the page). */
export const GDPR_FAQ: readonly FaqJsonLdItem[] = [
  {
    question: 'Cum îmi exercit drepturile GDPR pe ClickAnunț?',
    answer:
      'Trimite cererea de pe adresa de email asociată contului către dpo@clickanunt.ro și menționează tipul solicitării (acces, rectificare, ștergere, portabilitate, opoziție sau restricționare).',
  },
  {
    question: 'În cât timp primesc răspuns la o solicitare GDPR?',
    answer: 'Răspundem în termen de până la 30 de zile calendaristice, conform art. 12 GDPR.',
  },
  {
    question: 'Cui mă pot adresa dacă nu sunt mulțumit de răspuns?',
    answer:
      'Te poți adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).',
  },
];

/** /rambursari — refunds for paid promotions (matches visible refund policy). */
export const REFUND_FAQ: readonly FaqJsonLdItem[] = [
  {
    question: 'Sunt rambursabile promovările plătite?',
    answer:
      'În general, sumele pentru serviciile digitale de promovare nu sunt rambursabile după activare, în linie cu Termenii și Condițiile.',
  },
  {
    question: 'Există excepții de la politica de rambursare?',
    answer:
      'Pot exista excepții când serviciul nu a putut fi livrat din cauza platformei sau când anunțul este retras de operator din motive de conformitate; aceste situații se analizează individual.',
  },
  {
    question: 'Cui scriu pentru o problemă de facturare?',
    answer: 'Pentru aspecte de facturare scrie la billing@clickanunt.ro.',
  },
];

/** /anti-frauda — reporting and anti-fraud measures (matches visible policy). */
export const ANTIFRAUD_FAQ: readonly FaqJsonLdItem[] = [
  {
    question: 'Cum raportez un anunț suspect?',
    answer:
      'Folosește butonul „Raportează anunțul” din pagina anunțului (necesită cont autentificat) sau scrie la support@clickanunt.ro.',
  },
  {
    question: 'Ce măsuri poate lua ClickAnunț împotriva fraudei?',
    answer:
      'Putem ascunde, edita sau șterge anunțurile care încalcă regulile sau legea și putem restricționa ori suspenda conturile implicate în comportament repetat riscant.',
  },
  {
    question: 'Este ClickAnunț parte în tranzacțiile dintre utilizatori?',
    answer:
      'Nu. ClickAnunț nu este parte în tranzacțiile dintre utilizatori, dar poate reacționa la raportări și la semnale de abuz.',
  },
];
