/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
import { seoIndexableListingWhere } from "@/lib/seo/indexable-listing-where";
import { publicBrowseListingWhere } from "@/lib/listings/public-browse-server";

/**
 * Guards: public catalog hides pending; owner/admin/mobile owner scopes must not
 * reuse the public indexable filter accidentally.
 */
describe("owner/admin vs public listings filter", () => {
  const root = path.join(__dirname, "..", "..");

  function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), "utf8");
  }

  it("public browse requires moderationStatus approved (pending excluded)", () => {
    const where = publicBrowseListingWhere();
    expect(where.moderationStatus).toBe("approved");
    expect(seoIndexableListingWhere().moderationStatus).toBe("approved");
  });

  it("GET /api/listings applies indexable filter only for public active (no userId)", () => {
    const src = read("app/api/listings/route.ts");
    expect(src).toMatch(/if \(statusParam === "active" && !userIdParam\)/);
    expect(src).toMatch(/seoIndexableListingWhere\(\)/);
    expect(src).toMatch(/publicCatalogOnly: !resolvedOwnerForFts && statusParam !== "all"/);
  });

  it("owner scope sets ownerUserId and resolves FTS owner without publicCatalogOnly", () => {
    const src = read("app/api/listings/route.ts");
    expect(src).toMatch(/where\.ownerUserId = resolvedUserId/);
    expect(src).toMatch(/resolvedOwnerForFts = resolvedUserId/);
    // status=all skips the active+indexable branch
    expect(src).toMatch(/if \(statusParam !== "all"\)/);
  });

  it("admin moderation queue defaults to pending listings (not public indexable)", () => {
    const src = read("app/api/admin/moderation/queue/route.ts");
    expect(src).toMatch(/status = searchParams\.get\('status'\) \|\| 'pending'/);
    expect(src).not.toMatch(/seoIndexableListingWhere/);
    expect(src).not.toMatch(/publicBrowseListingWhere/);
  });

  it("mobile my() uses owner endpoint userId=me&status=all (keeps pending)", () => {
    const src = read("apps/mobile/src/api/client.ts");
    expect(src).toMatch(/\/api\/listings\?userId=me&status=all/);
  });

  it("publicCatalogOnly is true for public search route", () => {
    const src = read("app/api/search/route.ts");
    expect(src).toMatch(/publicCatalogOnly:\s*true/);
  });
});
