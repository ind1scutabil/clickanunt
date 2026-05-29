import type { FaqJsonLdItem } from "@/lib/seo/faq-jsonld";
import { buildFaqPageJsonLd } from "@/lib/seo/faq-jsonld";

/**
 * Visible FAQ block for legal/trust pages + matching FAQPage JSON-LD.
 *
 * The visible <dl> text and the JSON-LD are built from the SAME `items` array,
 * so the structured data matches the on-page content 1:1 (Google FAQ policy).
 * Renders nothing when there are no items.
 */
export function LegalFaqSection({ items }: { items: readonly FaqJsonLdItem[] }) {
  if (items.length === 0) return null;
  const faqJsonLd = buildFaqPageJsonLd([...items]);

  return (
    <section aria-labelledby="legal-faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h2 id="legal-faq-heading" className="mb-3 text-2xl font-semibold text-white">
        Întrebări frecvente
      </h2>
      <dl className="space-y-5">
        {items.map((item) => (
          <div key={item.question} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
            <dt className="font-medium text-white">{item.question}</dt>
            <dd className="mt-2 text-gray-300">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
