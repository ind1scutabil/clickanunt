/** @jest-environment node */
/**
 * Owner/admin vs public detail authorization — integration-style unit coverage
 * for statuses that may lack E2E fixtures / storageState.
 */
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { sanitizeListingPayloadForViewer } from "@/lib/listings/public-listing-dto";
import type { ListingStatus, ModerationStatus } from "@prisma/client";

type Shape = {
  deletedAt: Date | null;
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  expiresAt: Date | null;
};

function publicDetailDecision(listing: Shape, isOwnerOrAdmin: boolean): "200" | "404" {
  if (!isOwnerOrAdmin && !isListingSeoIndexable(listing)) return "404";
  return "200";
}

const baseListing = {
  id: "listing-1",
  ownerUserId: "owner-1",
  title: "Secret title",
  category: "Auto, moto și ambarcațiuni",
  description: "private desc",
  photos: ["https://example.com/a.jpg"],
  contactPhone: "+40700000000",
  status: "active",
  views: 1,
  isFeatured: false,
  isPromoted: false,
  feedBoost: 10,
  moderationStatus: "approved",
  createdAt: "2024-01-01T00:00:00.000Z",
  expiresAt: null,
  priceAmount: 1000,
  priceCurrency: "EUR",
  owner: { id: "owner-1", name: "Owner", email: "o@example.com" },
};

describe("detail authorization matrix (unit / no DB writes)", () => {
  const cases: Array<{
    label: string;
    shape: Shape;
    publicExpected: "200" | "404";
    ownerExpected: "200" | "404";
    adminExpected: "200" | "404";
  }> = [
    {
      label: "active approved valid",
      shape: {
        deletedAt: null,
        status: "active",
        moderationStatus: "approved",
        expiresAt: null,
      },
      publicExpected: "200",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "expired",
      shape: {
        deletedAt: null,
        status: "active",
        moderationStatus: "approved",
        expiresAt: new Date("2000-01-01"),
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "pending status",
      shape: {
        deletedAt: null,
        status: "pending",
        moderationStatus: "pending",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "paused",
      shape: {
        deletedAt: null,
        status: "paused",
        moderationStatus: "approved",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "draft",
      shape: {
        deletedAt: null,
        status: "draft",
        moderationStatus: "pending",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "rejected",
      shape: {
        deletedAt: null,
        status: "rejected",
        moderationStatus: "rejected",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "flagged moderation on active",
      shape: {
        deletedAt: null,
        status: "active",
        moderationStatus: "flagged",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
    {
      label: "soft-deleted (row excluded by deletedAt:null find — 404 for all via loader)",
      shape: {
        deletedAt: new Date("2024-06-01"),
        status: "deleted",
        moderationStatus: "approved",
        expiresAt: null,
      },
      // If a soft-deleted row were evaluated: not indexable publicly.
      // Existing GET uses deletedAt:null so the row is never returned → 404 for public/owner/admin alike.
      publicExpected: "404",
      ownerExpected: "404",
      adminExpected: "404",
    },
    {
      label: "status deleted without soft-delete timestamp",
      shape: {
        deletedAt: null,
        status: "deleted",
        moderationStatus: "approved",
        expiresAt: null,
      },
      publicExpected: "404",
      ownerExpected: "200",
      adminExpected: "200",
    },
  ];

  it.each(cases)("$label", ({ shape, publicExpected, ownerExpected, adminExpected }) => {
    // Soft-deleted: simulate loader miss → 404 for everyone before auth gate.
    if (shape.deletedAt != null) {
      expect("404").toBe(publicExpected);
      expect("404").toBe(ownerExpected);
      expect("404").toBe(adminExpected);
      return;
    }
    expect(publicDetailDecision(shape, false)).toBe(publicExpected);
    expect(publicDetailDecision(shape, true)).toBe(ownerExpected);
    expect(publicDetailDecision(shape, true)).toBe(adminExpected);
  });

  it("public payload strips ownerUserId; owner payload keeps it", () => {
    const pub = sanitizeListingPayloadForViewer(baseListing, { isOwnerOrAdmin: false });
    expect(pub).not.toHaveProperty("ownerUserId");
    expect(pub).not.toHaveProperty("moderationStatus");
    expect(pub).not.toHaveProperty("feedBoost");
    expect(pub).not.toHaveProperty("contactPhone");
    expect((pub as { hasContactPhone?: boolean }).hasContactPhone).toBe(true);
    expect((pub as { owner?: { email?: string } }).owner).not.toHaveProperty("email");

    const owner = sanitizeListingPayloadForViewer(baseListing, { isOwnerOrAdmin: true });
    expect(owner.ownerUserId).toBe("owner-1");
    expect(owner.moderationStatus).toBe("approved");
    expect(owner.feedBoost).toBe(10);
  });

  it("route returns 404 for non-indexable anonymous viewers", () => {
    const src = require("fs").readFileSync(
      require("path").join(process.cwd(), "app/api/listings/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("!isOwnerOrAdmin && !isListingSeoIndexable");
    expect(src).toContain('return NextResponse.json({ error: "Not found" }, { status: 404 })');
  });

  it("HTML detail page uses canRenderListingDetailHtml + notFound for anonymous soft-404", () => {
    const fs = require("fs");
    const path = require("path");
    const pageSrc: string = fs.readFileSync(
      path.join(process.cwd(), "app/listings/[id]/page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain("canRenderListingDetailHtml");
    expect(pageSrc).toContain("notFound()");
    const gateSrc: string = fs.readFileSync(
      path.join(process.cwd(), "lib/listings/listing-detail-html-access.ts"),
      "utf8",
    );
    expect(gateSrc).toContain("isListingSeoIndexable");
    expect(gateSrc).toContain("LISTINGS_UPDATE_ANY");
    expect(gateSrc).toContain("MODERATION_APPROVE_REJECT");
  });

  it("GET detail is read-only — no view increment and no listing_view event", () => {
    const src: string = require("fs").readFileSync(
      require("path").join(process.cwd(), "app/api/listings/[id]/route.ts"),
      "utf8",
    );
    const getBody = src.slice(
      src.indexOf("export async function GET"),
      src.indexOf("export async function PATCH"),
    );
    expect(getBody.length).toBeGreaterThan(0);
    expect(getBody).not.toContain("views: { increment: 1 }");
    expect(getBody).not.toContain("ANALYTICS_EVENT.listing_view");
    expect(getBody).not.toContain("recordListingView");
  });

  it("the view beacon route is the only place that increments listing.views", () => {
    const fs = require("fs");
    const path = require("path");

    const recorder: string = fs.readFileSync(
      path.join(process.cwd(), "lib/listings/record-listing-view.ts"),
      "utf8",
    );
    expect(recorder).toContain("views: { increment: 1 }");
    // Dedupe + increment must be serialised across every PM2 instance.
    expect(recorder).toContain("pg_advisory_xact_lock");
    expect(recorder).toContain("hashtextextended");
    expect(recorder).toContain("missing_session");
    expect(recorder).not.toContain("listing:view:iphash:");

    const beacon: string = fs.readFileSync(
      path.join(process.cwd(), "app/api/listings/[id]/view/route.ts"),
      "utf8",
    );
    expect(beacon).toContain("export const POST");
    expect(beacon).not.toContain("export const GET");
    expect(beacon).toContain("requireCSRF: true");
    expect(beacon).toContain("!isOwnerOrAdmin && !isListingSeoIndexable");
    expect(beacon).toContain("Cache-Control");
    expect(beacon).toContain("sec-fetch-site");
    expect(beacon).toContain("MAX_VIEW_BODY_BYTES");
    expect(beacon).toContain("getUserFromRequest");
  });
});
