import {
  buildOrganizationJsonLd,
  buildSearchActionJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/site-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld";
import {
  buildCategoryPageJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
} from "@/lib/seo/collection-jsonld";
import { buildFaqPageJsonLd } from "@/lib/seo/faq-jsonld";
import {
  generateBreadcrumbStructuredData,
  generateFaqPageStructuredData,
  generateItemListStructuredData,
  generateOrganizationStructuredData,
  generateWebSiteSearchStructuredData,
} from "@/lib/seo";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
});

afterAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

function isParseable(obj: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

describe("site-jsonld (Organization / WebSite / SearchAction)", () => {
  it("Organization is valid, parseable and emits NO fabricated rating/review fields", () => {
    delete process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL;
    delete process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL;
    delete process.env.NEXT_PUBLIC_BRAND_TWITTER_URL;
    delete process.env.NEXT_PUBLIC_BRAND_X_URL;
    const org = buildOrganizationJsonLd();
    expect(isParseable(org)).toBe(true);
    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org["@id"]).toBe("https://www.clickanunt.ro/#organization");
    expect(org.name).toBe("ClickAnunț");
    expect(org.alternateName).toEqual(
      expect.arrayContaining(["ClickAnunt", "clickanunt", "clickanunt.ro"]),
    );
    expect(org.description).toMatch(/clickanunt\.ro/i);
    expect(org.url).toBe("https://www.clickanunt.ro/");
    const logo = org.logo as Record<string, unknown>;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe("https://www.clickanunt.ro/brand/clickanunt-logo.png");
    expect(logo.contentUrl).toBe("https://www.clickanunt.ro/brand/clickanunt-logo.png");
    expect(logo.width).toBe(1254);
    expect(logo.height).toBe(1254);
    const serialized = JSON.stringify(org);
    expect(serialized).not.toMatch(/\/images\/logo\.png/);
    expect(serialized).not.toMatch(/aggregateRating/i);
    expect(serialized).not.toMatch(/ratingValue/i);
    expect(serialized).not.toMatch(/reviewCount/i);
    expect(serialized).not.toMatch(/founder/i);
    expect(serialized).not.toMatch(/facebook\.com/i);
    expect(serialized).not.toMatch(/instagram\.com/i);
  });

  it("SearchAction target matches the real on-site search URL pattern", () => {
    const action = buildSearchActionJsonLd();
    expect(action["@type"]).toBe("SearchAction");
    expect(action.target).toBe("https://www.clickanunt.ro/listings?q={search_term_string}");
    expect(action["query-input"]).toBe("required name=search_term_string");
  });

  it("WebSite has exactly one @context and a SearchAction potentialAction", () => {
    const site = buildWebSiteJsonLd();
    expect(isParseable(site)).toBe(true);
    expect(site["@context"]).toBe("https://schema.org");
    expect(site["@type"]).toBe("WebSite");
    expect(site["@id"]).toBe("https://www.clickanunt.ro/#website");
    expect(site.url).toBe("https://www.clickanunt.ro");
    expect(site.publisher).toEqual({ "@id": "https://www.clickanunt.ro/#organization" });
    expect(site.alternateName).toEqual(
      expect.arrayContaining(["ClickAnunt", "clickanunt", "clickanunt.ro"]),
    );
    expect(site.potentialAction["@type"]).toBe("SearchAction");
    // Nested action must not carry its own @context (single top-level context).
    expect((site.potentialAction as Record<string, unknown>)["@context"]).toBeUndefined();
  });
});

describe("breadcrumb-jsonld", () => {
  it("uses absolute URLs and 1-based positions in order", () => {
    const bc = buildBreadcrumbJsonLd([
      { name: "Acasă", url: "/" },
      { name: "Auto", url: "/auto" },
      { name: "BMW X5", url: "https://www.clickanunt.ro/listings/abc" },
    ]);
    expect(bc["@type"]).toBe("BreadcrumbList");
    const els = bc.itemListElement;
    expect(els.map((e) => e.position)).toEqual([1, 2, 3]);
    for (const e of els) {
      expect(typeof e.item).toBe("string");
      expect(e.item.startsWith("http")).toBe(true);
    }
    expect(els[0].item).toBe("https://www.clickanunt.ro/");
    expect(els[1].item).toBe("https://www.clickanunt.ro/auto");
    expect(els[2].item).toBe("https://www.clickanunt.ro/listings/abc");
  });
});

describe("collection-jsonld (ItemList / CollectionPage / CategoryPage)", () => {
  const items = [
    { title: "Anunț 1", path: "/listings/1" },
    { title: "Anunț 2", path: "/listings/2" },
  ];

  it("ItemList numberOfItems equals provided items (no fabricated counts)", () => {
    const list = buildItemListJsonLd({
      name: "Test",
      canonicalUrlAbs: "https://www.clickanunt.ro/listings",
      items,
    });
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0].item).toBe("https://www.clickanunt.ro/listings/1");
    expect(list["@context"]).toBe("https://schema.org");
  });

  it("nested ItemList (includeContext=false) omits @context", () => {
    const list = buildItemListJsonLd(
      { name: "Test", canonicalUrlAbs: "https://www.clickanunt.ro/listings", items },
      false,
    );
    expect((list as Record<string, unknown>)["@context"]).toBeUndefined();
  });

  it("CollectionPage nests a context-less ItemList as mainEntity", () => {
    const page = buildCollectionPageJsonLd({
      name: "Toate anunțurile",
      description: "Catalog public",
      canonicalUrlAbs: "https://www.clickanunt.ro/listings",
      items,
    });
    expect(isParseable(page)).toBe(true);
    expect(page["@context"]).toBe("https://schema.org");
    expect(page["@type"]).toBe("CollectionPage");
    const main = (page as Record<string, unknown>).mainEntity as Record<string, unknown>;
    expect(main["@type"]).toBe("ItemList");
    expect(main["@context"]).toBeUndefined();
    expect(main.numberOfItems).toBe(2);
  });

  it("CollectionPage omits mainEntity when there are zero items (no empty fabrication)", () => {
    const page = buildCollectionPageJsonLd({
      name: "Vide",
      canonicalUrlAbs: "https://www.clickanunt.ro/listings",
      items: [],
    });
    expect((page as Record<string, unknown>).mainEntity).toBeUndefined();
  });

  it("CategoryPage emits factual `about` Thing entities and filters empties", () => {
    const page = buildCategoryPageJsonLd({
      name: "Auto în București",
      canonicalUrlAbs: "https://www.clickanunt.ro/auto/bucuresti",
      about: ["Auto", "București", "", "   "],
      items,
    });
    expect(page["@type"]).toBe("CollectionPage");
    const about = (page as Record<string, unknown>).about as Array<{ "@type": string; name: string }>;
    expect(about).toEqual([
      { "@type": "Thing", name: "Auto" },
      { "@type": "Thing", name: "București" },
    ]);
  });

  it("CategoryPage omits `about` entirely when no factual labels supplied", () => {
    const page = buildCategoryPageJsonLd({
      name: "Auto",
      canonicalUrlAbs: "https://www.clickanunt.ro/auto",
      items,
    });
    expect((page as Record<string, unknown>).about).toBeUndefined();
  });
});

describe("faq-jsonld", () => {
  it("builds a parseable FAQPage with Question/Answer pairs", () => {
    const faq = buildFaqPageJsonLd([
      { question: "Este gratuit?", answer: "Publicarea de bază este gratuită." },
    ]);
    expect(isParseable(faq)).toBe(true);
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity[0]["@type"]).toBe("Question");
    expect(faq.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe("Publicarea de bază este gratuită.");
  });
});

describe("lib/seo back-compat delegation (zero output change)", () => {
  it("legacy generators produce output identical to the new builders", () => {
    expect(generateOrganizationStructuredData()).toEqual(buildOrganizationJsonLd());
    expect(generateWebSiteSearchStructuredData()).toEqual(buildWebSiteJsonLd());
    expect(
      generateBreadcrumbStructuredData([
        { name: "Acasă", url: "/" },
        { name: "Auto", url: "/auto" },
      ]),
    ).toEqual(
      buildBreadcrumbJsonLd([
        { name: "Acasă", url: "/" },
        { name: "Auto", url: "/auto" },
      ]),
    );
    const itemOpts = {
      name: "Test",
      description: "desc",
      canonicalUrlAbs: "https://www.clickanunt.ro/listings",
      items: [{ title: "A", path: "/listings/1" }],
    };
    expect(generateItemListStructuredData(itemOpts)).toEqual(buildItemListJsonLd(itemOpts));
    const faqItems = [{ question: "Q", answer: "A" }];
    expect(generateFaqPageStructuredData(faqItems)).toEqual(buildFaqPageJsonLd(faqItems));
  });
});
