/** @jest-environment node */
import {
  formatPhoneDisplay,
  isListingPhoneRevealEligible,
  listingHasContactPhone,
  normalizeContactPhoneForReveal,
  phoneToTelHref,
} from "@/lib/phone-display";

describe("phone-display / reveal helpers", () => {
  it("normalizes valid RO-like phones and rejects junk", () => {
    expect(normalizeContactPhoneForReveal("0712 345 678")).toBe("0712 345 678");
    expect(normalizeContactPhoneForReveal("+40 712 345 678")).toBe("+40 712 345 678");
    expect(normalizeContactPhoneForReveal("")).toBeNull();
    expect(normalizeContactPhoneForReveal("123")).toBeNull();
    expect(normalizeContactPhoneForReveal("javascript:alert(1)")).toBeNull();
    expect(normalizeContactPhoneForReveal("<script>")).toBeNull();
  });

  it("builds safe tel hrefs", () => {
    expect(phoneToTelHref("0712 345 678")).toBe("0712345678");
    expect(phoneToTelHref("+40 712 345 678")).toBe("+40712345678");
    expect(phoneToTelHref("javascript:alert(1)")).toBe("");
    expect(phoneToTelHref("")).toBe("");
  });

  it("formatPhoneDisplay trims only", () => {
    expect(formatPhoneDisplay("  0712  ")).toBe("0712");
  });

  it("listingHasContactPhone", () => {
    expect(listingHasContactPhone({ contactPhone: "0712345678" })).toBe(true);
    expect(listingHasContactPhone({ contactPhone: null })).toBe(false);
    expect(listingHasContactPhone({})).toBe(false);
  });

  it("eligibility matches public browse core", () => {
    expect(
      isListingPhoneRevealEligible({
        status: "active",
        moderationStatus: "approved",
        deletedAt: null,
        expiresAt: null,
      })
    ).toBe(true);
    expect(
      isListingPhoneRevealEligible({
        status: "paused",
        moderationStatus: "approved",
        deletedAt: null,
        expiresAt: null,
      })
    ).toBe(false);
  });
});
