/** @jest-environment node */
import {
  PUBLIC_FORBIDDEN_LISTING_KEYS,
  PUBLIC_FORBIDDEN_OWNER_KEYS,
  PUBLIC_LISTING_KEYS,
  PUBLIC_OWNER_KEYS,
  listingPayloadContainsOwnerEmail,
  sanitizeListingPayloadForViewer,
  toPublicListingOwner,
  toPublicListingPayload,
} from "@/lib/listings/public-listing-dto";
import { readFileSync } from "fs";
import path from "path";

const fullOwner = {
  id: "owner-1",
  email: "seller@example.com",
  name: "Seller",
  phone: "+40000000000",
  businessPhone: "+40000000001",
  businessName: "Shop",
  avatar: null as string | null,
  phoneVerified: true,
  emailVerified: true,
  trustScore: 80,
  totalSales: 1,
  averageRating: 5,
  totalListings: 3,
  responseRate: 90,
  role: "user",
  subscriptionTier: "pro",
  passwordHash: "secret-hash",
  stripeCustomerId: "cus_secret",
  ipAddress: "1.2.3.4",
  sessionId: "sess_secret",
  createdAt: "2024-01-01T00:00:00.000Z",
  privateOwnerToken: "must-not-leak",
};

const fullListing = {
  id: "listing-1",
  ownerUserId: "owner-1",
  title: "Test",
  category: "auto",
  subcategory: "suv",
  description: "desc",
  condition: "used",
  photos: ["https://example.com/a.jpg"],
  county: "Bucuresti",
  city: "Bucuresti",
  region: "Sud",
  contactPhone: "+40700000000",
  make: "Dacia",
  model: "Duster",
  year: 2020,
  mileage: 50000,
  fuel: "petrol",
  transmission: "manual",
  vin: "VF1XXXX",
  isDealer: false,
  dealerBrands: [] as string[],
  dealerPriceMin: null as number | null,
  dealerPriceMax: null as number | null,
  attributes: { color: "white", nestedSecret: "ok-user-content" },
  status: "active",
  views: 10,
  isFeatured: false,
  feedBoost: 1,
  isPromoted: false,
  promotionType: null as string | null,
  promotionExpiresAt: null as string | null,
  promotionStartedAt: null as string | null,
  moderationStatus: "approved",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  publishedAt: "2024-01-01T00:00:00.000Z",
  expiresAt: null as string | null,
  priceAmount: 10000,
  priceCurrency: "EUR",
  priceType: "FIXED",
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  salaryCurrency: null as string | null,
  salaryPeriod: null as string | null,
  moderationNotes: "internal note",
  scamFlags: ["x"],
  scamScore: 9,
  isScamSuspected: true,
  isDuplicate: false,
  duplicateOfId: null as string | null,
  moderatedBy: "admin-1",
  moderatedAt: "2024-01-03T00:00:00.000Z",
  deletedAt: null as string | null,
  stripePaymentIntentId: "pi_secret",
  ipAddress: "9.9.9.9",
  sessionId: "sess_listing",
  fakePrivateField: "must-not-propagate",
  owner: fullOwner,
};

const PUBLICLY_TRIMMED_KEYS = [
  "ownerUserId",
  "moderationStatus",
  "feedBoost",
  "isDealer",
  "dealerBrands",
  "dealerPriceMin",
  "dealerPriceMax",
  "region",
  "promotionType",
  "promotionExpiresAt",
  "promotionStartedAt",
  "updatedAt",
  "publishedAt",
] as const;

describe("public listing DTO — default-deny allowlist", () => {
  it("public payload keys are exactly the approved listing allowlist", () => {
    const out = toPublicListingPayload(fullListing);
    expect(Object.keys(out).sort()).toEqual([...PUBLIC_LISTING_KEYS].sort());
  });

  it("trims ownerUserId/moderationStatus/dealer/promotion/region/timestamps from public payloads", () => {
    const out = toPublicListingPayload(fullListing);
    for (const key of PUBLICLY_TRIMMED_KEYS) {
      expect(out).not.toHaveProperty(key);
      expect(PUBLIC_LISTING_KEYS).not.toContain(key);
    }
    expect(out).not.toHaveProperty("contactPhone");
    expect(out.hasContactPhone).toBe(true);
    expect(out.owner).toEqual(expect.objectContaining({ id: "owner-1" }));
    expect(out.status).toBe("active");
  });

  it("owner/admin still receives ownerUserId and moderationStatus via pass-through", () => {
    const out = sanitizeListingPayloadForViewer(fullListing, { isOwnerOrAdmin: true });
    expect(out.ownerUserId).toBe("owner-1");
    expect(out.moderationStatus).toBe("approved");
    expect(out.feedBoost).toBe(1);
  });

  it("public owner keys are exactly the approved owner allowlist", () => {
    const owner = toPublicListingOwner(fullOwner);
    expect(owner).not.toBeNull();
    expect(Object.keys(owner!).sort()).toEqual([...PUBLIC_OWNER_KEYS].sort());
  });

  it("public viewer: hasContactPhone only, strips account PII and internals", () => {
    const out = sanitizeListingPayloadForViewer(fullListing, { isOwnerOrAdmin: false });
    expect(listingPayloadContainsOwnerEmail(out)).toBe(false);
    expect(out).not.toHaveProperty("contactPhone");
    expect(out.hasContactPhone).toBe(true);
    expect(out.owner).toEqual(
      expect.objectContaining({
        id: "owner-1",
        name: "Seller",
        businessName: "Shop",
        phoneVerified: true,
        emailVerified: true,
        trustScore: 80,
        totalListings: 3,
        responseRate: 90,
      }),
    );
    for (const key of PUBLIC_FORBIDDEN_LISTING_KEYS) {
      expect(out).not.toHaveProperty(key);
    }
    for (const key of PUBLIC_FORBIDDEN_OWNER_KEYS) {
      expect(out.owner).not.toHaveProperty(key);
    }
    expect(out).not.toHaveProperty("fakePrivateField");
    expect(out.owner).not.toHaveProperty("privateOwnerToken");
  });

  it("fictitious private fields on input never appear on public output", () => {
    const dirty = {
      ...fullListing,
      internalNotesV2: "secret",
      paymentRaw: { stripe: "pi_x" },
      owner: { ...fullOwner, oauthRefreshToken: "tok", moderationNotes: "no" },
    };
    const out = toPublicListingPayload(dirty);
    expect(out).not.toHaveProperty("internalNotesV2");
    expect(out).not.toHaveProperty("paymentRaw");
    expect(out.owner).not.toHaveProperty("oauthRefreshToken");
    expect(out.owner).not.toHaveProperty("moderationNotes");
    expect(Object.keys(out).every((k) => (PUBLIC_LISTING_KEYS as readonly string[]).includes(k))).toBe(
      true,
    );
    expect(
      Object.keys(out.owner as object).every((k) =>
        (PUBLIC_OWNER_KEYS as readonly string[]).includes(k),
      ),
    ).toBe(true);
  });

  it("owner/admin viewer: keeps email and internal fields needed for tools", () => {
    const out = sanitizeListingPayloadForViewer(fullListing, { isOwnerOrAdmin: true });
    expect(out.owner?.email).toBe("seller@example.com");
    expect(out.owner?.phone).toBe("+40000000000");
    expect(out.moderationNotes).toBe("internal note");
    expect(out.scamFlags).toEqual(["x"]);
    expect(out.fakePrivateField).toBe("must-not-propagate");
  });

  it("JSON serialization does not reintroduce stripped private keys", () => {
    const out = toPublicListingPayload({
      ...fullListing,
      undefinedLeak: undefined,
      owner: { ...fullOwner, email: "seller@example.com" },
    });
    const wired = JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
    expect(wired).not.toHaveProperty("moderationNotes");
    expect(wired).not.toHaveProperty("scamScore");
    expect(wired).not.toHaveProperty("fakePrivateField");
    expect(wired).not.toHaveProperty("undefinedLeak");
    const owner = wired.owner as Record<string, unknown>;
    expect(owner).not.toHaveProperty("email");
    expect(owner).not.toHaveProperty("phone");
    expect(owner).not.toHaveProperty("privateOwnerToken");
    expect(Object.keys(wired).sort()).toEqual([...PUBLIC_LISTING_KEYS].sort());
  });

  it("toPublicListingOwner never includes email / phones / role", () => {
    const pub = toPublicListingOwner(fullOwner);
    expect(pub).not.toHaveProperty("email");
    expect(pub).not.toHaveProperty("phone");
    expect(pub).not.toHaveProperty("businessPhone");
    expect(pub).not.toHaveProperty("role");
    expect(pub?.id).toBe("owner-1");
  });

  it("catalog and detail routes share the same public sanitizer", () => {
    const root = path.join(process.cwd());
    const detail = readFileSync(path.join(root, "app/api/listings/[id]/route.ts"), "utf8");
    const catalog = readFileSync(path.join(root, "app/api/listings/route.ts"), "utf8");
    expect(detail).toContain('from "@/lib/listings/public-listing-dto"');
    expect(catalog).toContain('from "@/lib/listings/public-listing-dto"');
    expect(detail).toContain("sanitizeListingPayloadForViewer");
    expect(catalog).toContain("sanitizeListingPayloadForViewer");
  });

  it("API Cache-Control is private no-store with Vary Cookie Authorization", () => {
    const cfg = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(cfg).toMatch(/source:\s*'\/api\/:path/);
    expect(cfg).toMatch(/private,\s*no-store/);
    expect(cfg).toMatch(/Vary['"]\s*,\s*value:\s*'Cookie,\s*Authorization'/);
  });

  it("does not use spread-then-delete as the public path", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/listings/public-listing-dto.ts"), "utf8");
    // Ignore comments — assert executable public path copies allowlisted keys only.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.\.\.\s*listing\b/);
    expect(code).not.toMatch(/\.\.\.\s*owner\b/);
    expect(code).not.toMatch(/\bdelete\s+/);
    expect(src).toContain("PUBLIC_LISTING_KEYS");
    expect(src).toContain("PUBLIC_OWNER_KEYS");
    expect(src).toContain("toPublicListingPayload");
  });
});
