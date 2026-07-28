/**
 * Local JSON-LD quality checks — does not claim Google Rich Results validation.
 */
export type JsonLdIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type JsonLdQualityInput = {
  visiblePriceText?: string | null;
  offerPrice?: number | null;
  offerCurrency?: string | null;
  visibleCurrency?: string | null;
  priceType?: string | null;
  canonicalUrl?: string | null;
  jsonLdUrl?: string | null;
  hasImage?: boolean;
  indexable?: boolean;
  category?: string | null;
  emitsCommercialOffer?: boolean;
  containsPhone?: boolean;
  containsEmail?: boolean;
};

export function evaluateListingJsonLdQuality(input: JsonLdQualityInput): JsonLdIssue[] {
  const issues: JsonLdIssue[] = [];

  if (input.containsPhone) {
    issues.push({
      severity: "error",
      code: "PII_PHONE",
      message: "JSON-LD must not include protected phone numbers",
    });
  }
  if (input.containsEmail) {
    issues.push({
      severity: "error",
      code: "PII_EMAIL",
      message: "JSON-LD must not include owner email",
    });
  }

  if (input.canonicalUrl && input.jsonLdUrl && input.canonicalUrl !== input.jsonLdUrl) {
    issues.push({
      severity: "error",
      code: "URL_MISMATCH",
      message: "JSON-LD URL must match canonical",
    });
  }

  const type = (input.priceType || "FIXED").toUpperCase();
  if (type === "FREE" || type === "ON_REQUEST") {
    if (input.offerPrice != null) {
      issues.push({
        severity: "error",
        code: "INVENTED_OFFER_PRICE",
        message: `${type} must not emit Offer.price`,
      });
    }
  }

  if (input.emitsCommercialOffer && input.offerPrice != null && input.offerCurrency) {
    if (input.visibleCurrency && input.visibleCurrency.toUpperCase() !== input.offerCurrency.toUpperCase()) {
      issues.push({
        severity: "error",
        code: "CURRENCY_MISMATCH",
        message: "Offer.priceCurrency must match visible currency",
      });
    }
    if (input.visiblePriceText && input.offerPrice > 0) {
      const digits = String(input.offerPrice);
      if (!input.visiblePriceText.replace(/\./g, "").includes(digits) &&
          !input.visiblePriceText.includes(digits)) {
        // soft check — formatted numbers may include grouping
        const compactVisible = input.visiblePriceText.replace(/[^\d]/g, "");
        if (compactVisible && compactVisible !== digits) {
          issues.push({
            severity: "warning",
            code: "PRICE_DIGITS_DIVERGE",
            message: "Visible price digits may diverge from Offer.price",
          });
        }
      }
    }
  }

  if (input.indexable && input.emitsCommercialOffer && input.hasImage === false) {
    issues.push({
      severity: "warning",
      code: "MISSING_IMAGE",
      message: "Indexable commercial listing without image in JSON-LD",
    });
  }

  if (input.indexable === false && input.emitsCommercialOffer) {
    issues.push({
      severity: "warning",
      code: "COMMERCIAL_ON_NOINDEX",
      message: "Non-indexable page emits commercial Offer schema",
    });
  }

  return issues;
}
