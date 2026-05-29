import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/site-jsonld";

/** Global JSON-LD: Organization + WebSite (+ SearchAction) — avoids duplicating PostalAddress/geo with Organization. */
export function GlobalJsonLd() {
  const entries = [buildOrganizationJsonLd(), buildWebSiteJsonLd()];

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
