import { buildFaqPageJsonLd } from "@/lib/seo/faq-jsonld";
import { ANTIFRAUD_FAQ, GDPR_FAQ, REFUND_FAQ } from "@/lib/seo/legal-faq";

const ALL = { GDPR_FAQ, REFUND_FAQ, ANTIFRAUD_FAQ };
// Same source array feeds both the visible <dl> (LegalFaqSection) and the JSON-LD,
// so these checks prove the structured data matches the on-page FAQ 1:1.

const FORBIDDEN = [/aggregateRating/i, /ratingValue/i, /reviewCount/i, /50K/i, /100K/i, /\b1M\b/i, /4\.8/];

describe("legal FAQ content (factual, 1:1, no fabrication)", () => {
  for (const [name, items] of Object.entries(ALL)) {
    describe(name, () => {
      it("is non-empty and every item has a question + answer", () => {
        expect(items.length).toBeGreaterThan(0);
        for (const it of items) {
          expect(typeof it.question).toBe("string");
          expect(it.question.trim().length).toBeGreaterThan(0);
          expect(typeof it.answer).toBe("string");
          expect(it.answer.trim().length).toBeGreaterThan(0);
        }
      });

      it("FAQPage JSON-LD matches the source array 1:1", () => {
        const ld = buildFaqPageJsonLd([...items]);
        expect(ld["@type"]).toBe("FAQPage");
        expect(ld.mainEntity).toHaveLength(items.length);
        ld.mainEntity.forEach((q, i) => {
          expect(q["@type"]).toBe("Question");
          expect(q.name).toBe(items[i].question);
          expect(q.acceptedAnswer["@type"]).toBe("Answer");
          expect(q.acceptedAnswer.text).toBe(items[i].answer);
        });
        // parseable round-trip
        expect(() => JSON.parse(JSON.stringify(ld))).not.toThrow();
      });

      it("contains no fabricated stats/ratings", () => {
        const blob = items.map((i) => `${i.question} ${i.answer}`).join(" ");
        for (const re of FORBIDDEN) expect(blob).not.toMatch(re);
      });
    });
  }
});
