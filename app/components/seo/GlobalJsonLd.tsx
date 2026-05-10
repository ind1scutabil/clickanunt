import {
  generateOrganizationStructuredData,
  generateWebSiteSearchStructuredData,
} from "@/lib/seo";

/** Global JSON-LD: Organization + WebSite (+ SearchAction) — avoids duplicating PostalAddress/geo with Organization. */
export function GlobalJsonLd() {
  const entries = [generateOrganizationStructuredData(), generateWebSiteSearchStructuredData()];

  return (
    <>
      {entries.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
