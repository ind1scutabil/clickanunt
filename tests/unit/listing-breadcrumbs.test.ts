/**
 * @jest-environment node
 */

import {
  buildListingBreadcrumbItems,
  buildListingBreadcrumbJsonLdItems,
} from "@/lib/seo/listing-breadcrumbs";

const skoda = {
  id: "d3b25237-15fa-432f-9946-ef29d3f5c2f6",
  title: "Skoda Octavia 2",
  category: "Auto, moto și ambarcațiuni",
  city: "Târgu Jiu",
  make: "Skoda",
  model: "Octavia",
};

describe("listing breadcrumbs", () => {
  it("inserts real Auto make/model hubs between category and city", () => {
    const crumbs = buildListingBreadcrumbItems(skoda);
    expect(crumbs.map((c) => ({ label: c.label, href: c.href }))).toEqual([
      { label: "Acasă", href: "/" },
      { label: "Auto", href: "/auto" },
      { label: "Skoda", href: "/auto/skoda" },
      { label: "Octavia", href: "/auto/skoda/octavia" },
      { label: "Târgu Jiu", href: "/auto/targu-jiu" },
      { label: "Skoda Octavia 2", href: undefined },
    ]);
  });

  it("keeps JSON-LD identical to the visible trail, with the listing as the last URL", () => {
    const nav = buildListingBreadcrumbItems(skoda);
    const jsonLd = buildListingBreadcrumbJsonLdItems(skoda);

    expect(jsonLd.map((i) => i.name)).toEqual(nav.map((i) => i.label));
    expect(jsonLd.map((i) => i.url)).toEqual([
      "/",
      "/auto",
      "/auto/skoda",
      "/auto/skoda/octavia",
      "/auto/targu-jiu",
      `/listings/${skoda.id}`,
    ]);
  });

  it("does not invent make/model hubs for unknown brands", () => {
    const crumbs = buildListingBreadcrumbItems({
      ...skoda,
      make: "NotARealMake",
      model: "Whatever",
    });
    expect(crumbs.map((c) => c.href)).toEqual(["/", "/auto", "/auto/targu-jiu", undefined]);
  });

  it("falls back to category → city for non-auto listings", () => {
    const crumbs = buildListingBreadcrumbItems({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      title: "Apartament 2 camere",
      category: "Imobiliare",
      city: "Cluj-Napoca",
      make: null,
      model: null,
    });
    expect(crumbs.map((c) => c.href)).toEqual([
      "/",
      "/imobiliare",
      "/imobiliare/cluj-napoca",
      undefined,
    ]);
  });
});
