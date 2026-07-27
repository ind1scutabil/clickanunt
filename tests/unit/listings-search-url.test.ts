/** @jest-environment node */
import { buildListingsSearchHref } from "@/lib/listings-search-url";
import { listingEditSchema } from "@/lib/security/validation-schemas";

describe("buildListingsSearchHref", () => {
  it("uses canonical q= and trims", () => {
    expect(buildListingsSearchHref("  Peugeot 508  ")).toBe(
      "/listings?q=Peugeot+508"
    );
    expect(buildListingsSearchHref("mașină")).toBe(
      "/listings?q=ma%C8%99in%C4%83"
    );
  });

  it("empty / whitespace navigates to catalog without q", () => {
    expect(buildListingsSearchHref("")).toBe("/listings");
    expect(buildListingsSearchHref("   ")).toBe("/listings");
  });

  it("never emits search=", () => {
    expect(buildListingsSearchHref("telefon")).not.toMatch(/search=/);
    expect(buildListingsSearchHref("telefon", { category: "Auto" })).toMatch(
      /^\/listings\?/
    );
    expect(buildListingsSearchHref("telefon", { category: "Auto" })).toContain(
      "q=telefon"
    );
  });
});

describe("listingEditSchema ownership spoof", () => {
  it("rejects ownerUserId on PATCH", () => {
    const r = listingEditSchema.safeParse({
      title: "Titlu valid pentru spoof test",
      ownerUserId: "00000000-0000-4000-8000-000000000099",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const text = r.error.issues.map((i) => i.message).join(" ");
      expect(text).toMatch(/unrecognized key/i);
      expect(JSON.stringify(r.error.issues)).toMatch(/ownerUserId/);
    }
  });
});
