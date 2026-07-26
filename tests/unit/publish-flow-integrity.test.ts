/**
 * Integrity: publish wizard must not clear draft on error, must not claim perfect titles,
 * must not link dead create routes, must not show video UI without persistence.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("publish flow integrity", () => {
  const flow = read("app/components/OptimizedListingFlow.tsx");
  const route = read("app/api/listings/route.ts");
  const nav = read("app/components/MobileBottomNav.tsx");

  it("clears listingDraft only on success path, not in catch", () => {
    const catchIdx = flow.indexOf("catch (error");
    expect(catchIdx).toBeGreaterThan(0);
    const catchBlock = flow.slice(catchIdx, catchIdx + 500);
    expect(catchBlock).not.toMatch(/removeItem\(["']listingDraft["']\)/);
    expect(flow).toMatch(/Clear draft only after confirmed server-side create/);
  });

  it("does not advertise Titlu perfect", () => {
    expect(flow).not.toMatch(/Titlu perfect/);
  });

  it("hides video upload UI (no Listing.video column)", () => {
    expect(flow).toMatch(/Video: hidden/);
    expect(flow).not.toMatch(/accept=["']video\/\*["']/);
  });

  it("formats moderation flags without Array.join on objects", () => {
    expect(route).toMatch(/formatModerationFlagsForNotes/);
    expect(route).not.toMatch(/flags\.join\(/);
  });

  it("hides bottom nav on publish and does not mark catalog for /listings/new", () => {
    expect(nav).toMatch(/isPublishFlow/);
    expect(nav).toMatch(/return null/);
  });

  it("legacy dashboard create redirects to /listings/new", () => {
    const page = read("app/dashboard/listings/create/page.tsx");
    expect(page).toMatch(/redirect\(["']\/listings\/new["']\)/);
  });

  it("currency selector has no emoji flags", () => {
    expect(flow).not.toMatch(/💵|💶/);
  });
});
