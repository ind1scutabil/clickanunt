/** @jest-environment node */
import { formatListingPrice } from "@/lib/format-listing-price";

describe("formatListingPrice", () => {
  it("formats EUR without duplicating the currency code", () => {
    expect(formatListingPrice(10290, "EUR")).toBe("10.290 EUR");
  });

  it("formats RON without duplicating the currency code", () => {
    expect(formatListingPrice(2500, "RON")).toBe("2.500 RON");
  });

  it("treats zero as Negociabil", () => {
    expect(formatListingPrice(0, "EUR")).toBe("Negociabil");
  });

  it("defaults missing currency to RON", () => {
    expect(formatListingPrice(100, null)).toBe("100 RON");
  });
});
