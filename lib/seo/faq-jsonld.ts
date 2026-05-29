/**
 * FAQPage JSON-LD. MUST only be emitted on pages that render the same Q&A
 * visibly to users (Google FAQ guidelines + anti-spam policy here). Answers
 * must be factual and policy-based; no fabricated guarantees/claims.
 *
 * Single source of truth — `lib/seo.ts#generateFaqPageStructuredData`
 * delegates here for back-compat.
 */

export interface FaqJsonLdItem {
  question: string;
  answer: string;
}

export function buildFaqPageJsonLd(items: FaqJsonLdItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}
