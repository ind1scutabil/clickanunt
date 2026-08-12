/** @jest-environment node */
/**
 * Mobile client query + deep-link helpers — mirror real API/web paths.
 */
import {
  listingsBrowseQueryString,
  mergeListingsByIdUnique,
  parseListingsHasMore,
} from "../../apps/mobile/src/api/listingsBrowseQuery";
import { safeApiErrorMessage, httpStatusFallbackMessage, HTTP_ERROR_DEMO_STATUSES, safeNetworkErrorMessage } from "../../apps/mobile/src/api/safeApiError";
import { extractListingIdFromDeepLink } from "../../apps/mobile/src/auth/listing-deep-link";
import { extractEmailVerificationToken } from "../../apps/mobile/src/auth/email-verification-linking";
import { buildMobileRegisterExtendedPayload } from "../../apps/mobile/src/auth/register-extended-payload";
import { isCityInCounty, isKnownCounty } from "../../lib/listing-location-make-validation";
import { CITIES_BY_COUNTY } from "../../lib/carData";

describe("listingsBrowseQueryString", () => {
  it("includes county/city/make/model when provided", () => {
    const qs = listingsBrowseQueryString({
      page: 2,
      limit: 24,
      sort: "priceAsc",
      category: "Auto, moto și ambarcațiuni",
      q: "bmw",
      county: "București",
      city: "Sectorul 1",
      make: "BMW",
      model: "X5",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("page")).toBe("2");
    expect(params.get("sort")).toBe("priceAsc");
    expect(params.get("county")).toBe("București");
    expect(params.get("city")).toBe("Sectorul 1");
    expect(params.get("make")).toBe("BMW");
    expect(params.get("model")).toBe("X5");
    expect(params.get("q")).toBe("bmw");
  });

  it("includes subcategory when provided", () => {
    const qs = listingsBrowseQueryString({
      category: "Auto, moto și ambarcațiuni",
      subcategory: "Autoturisme",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("category")).toBe("Auto, moto și ambarcațiuni");
    expect(params.get("subcategory")).toBe("Autoturisme");
  });

  it("omits q shorter than 2 chars", () => {
    const qs = listingsBrowseQueryString({ q: "a" });
    expect(new URLSearchParams(qs).has("q")).toBe(false);
  });
});

describe("mergeListingsByIdUnique", () => {
  it("appends only unseen ids", () => {
    const prev = [{ id: "a" }, { id: "b" }];
    const next = mergeListingsByIdUnique(prev, [{ id: "b" }, { id: "c" }]);
    expect(next.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("returns previous when incoming empty", () => {
    const prev = [{ id: "a" }];
    expect(mergeListingsByIdUnique(prev, [])).toBe(prev);
  });
});

describe("parseListingsHasMore", () => {
  it("prefers top-level hasMore", () => {
    expect(parseListingsHasMore({ hasMore: true, pagination: { hasMore: false } })).toBe(true);
  });

  it("falls back to pagination.hasMore", () => {
    expect(parseListingsHasMore({ pagination: { hasMore: true } })).toBe(true);
    expect(parseListingsHasMore({})).toBe(false);
  });
});

describe("extractListingIdFromDeepLink", () => {
  it("parses clickanunt://listings/:id", () => {
    expect(extractListingIdFromDeepLink("clickanunt://listings/abc12345xyz")).toBe("abc12345xyz");
  });

  it("parses https www listing path", () => {
    expect(
      extractListingIdFromDeepLink("https://www.clickanunt.ro/listings/listingid99")
    ).toBe("listingid99");
  });

  it("parses https www listing UUID path", () => {
    expect(
      extractListingIdFromDeepLink(
        "https://www.clickanunt.ro/listings/f7ad0849-7ae0-44a6-a43f-45082327ccd2"
      )
    ).toBe("f7ad0849-7ae0-44a6-a43f-45082327ccd2");
  });

  it("parses Expo Go /--/listings/:id path", () => {
    expect(
      extractListingIdFromDeepLink(
        "exp://127.0.0.1:8081/--/listings/f7ad0849-7ae0-44a6-a43f-45082327ccd2"
      )
    ).toBe("f7ad0849-7ae0-44a6-a43f-45082327ccd2");
  });

  it("returns null for unrelated URLs", () => {
    expect(extractListingIdFromDeepLink("https://www.clickanunt.ro/privacy")).toBeNull();
    expect(extractListingIdFromDeepLink("https://www.clickanunt.ro/auto")).toBeNull();
  });
});

describe("location make sources", () => {
  it("maps București to sectors, not city=București", () => {
    expect(isKnownCounty("București")).toBe(true);
    expect(isCityInCounty("București", "Sectorul 1")).toBe(true);
    expect(isCityInCounty("București", "București")).toBe(false);
    expect(CITIES_BY_COUNTY["București"]).toContain("Sectorul 1");
  });

  it("maps Cluj → Cluj-Napoca", () => {
    expect(isCityInCounty("Cluj", "Cluj-Napoca")).toBe(true);
  });
});

describe("extractEmailVerificationToken", () => {
  it("still parses verify-email query token", () => {
    const token = "A".repeat(40);
    expect(extractEmailVerificationToken(`clickanunt://verify-email?token=${token}`)).toBe(token);
  });
});

describe("buildMobileRegisterExtendedPayload", () => {
  it("builds business payload with accountType business", () => {
    const payload = buildMobileRegisterExtendedPayload({
      email: " dealer@example.com ",
      password: "Abcd1234!",
      confirmPassword: "Abcd1234!",
      name: " Contact ",
      businessName: " Firma SRL ",
      businessCUI: " RO123 ",
      businessRegCom: " J40/1/2020 ",
      businessPhone: " 0712345678 ",
      businessCategory: "auto_dealer",
      businessLocation: " București ",
    });
    expect(payload.accountType).toBe("business");
    expect(payload.email).toBe("dealer@example.com");
    expect(payload.businessName).toBe("Firma SRL");
    expect(payload.businessLocation).toBe("București");
    expect(payload.businessCategory).toBe("auto_dealer");
  });

  it("omits empty optional fields", () => {
    const payload = buildMobileRegisterExtendedPayload({
      email: "a@example.com",
      password: "Abcd1234!",
      name: "Contact",
      businessName: "Firma",
      businessCUI: "RO1",
      businessRegCom: "J40/1/2020",
      businessPhone: "0712345678",
      businessCategory: "retail",
      businessEmail: "  ",
      businessWebsite: "",
    });
    expect(payload.businessEmail).toBeUndefined();
    expect(payload.businessWebsite).toBeUndefined();
    expect(payload.businessLocation).toBeUndefined();
  });
});

describe("safeApiErrorMessage", () => {
  it("prefers error over message", () => {
    expect(safeApiErrorMessage({ error: "Parolă greșită", message: "ignore" }, 401)).toBe(
      "Parolă greșită"
    );
  });

  it("rejects bearer / jwt-looking dumps", () => {
    expect(
      safeApiErrorMessage({ error: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb" }, 500)
    ).toBe(httpStatusFallbackMessage(500));
  });

  it("uses Romanian fallbacks when payload lacks a useful string", () => {
    for (const status of HTTP_ERROR_DEMO_STATUSES) {
      expect(safeApiErrorMessage(null, status)).toBe(httpStatusFallbackMessage(status));
      expect(safeApiErrorMessage({ error: "" }, status)).toBe(httpStatusFallbackMessage(status));
      expect(safeApiErrorMessage({ error: 42 }, status)).toBe(httpStatusFallbackMessage(status));
    }
  });

  it("maps 400 and 422 to the same validation fallback", () => {
    expect(httpStatusFallbackMessage(400)).toBe(httpStatusFallbackMessage(422));
    expect(httpStatusFallbackMessage(400)).toMatch(/valid/i);
  });

  it("still prefers safe server message over fallback", () => {
    expect(safeApiErrorMessage({ message: "Anunțul nu există" }, 404)).toBe("Anunțul nu există");
  });
});

describe("httpStatusFallbackMessage demo matrix", () => {
  /**
   * Parity demo without production backdoors:
   * assert `safeApiErrorMessage(null, status)` for each code, or temporarily mock
   * `fetch` in a local Metro session to return `{ ok:false, status }` with empty JSON.
   * Do not add test query params / debug routes to API handlers.
   */
  it("covers the HTTP status matrix used in mobile parity demos", () => {
    const expected: Record<number, RegExp> = {
      400: /valid/i,
      401: /Sesiune|Autentific/i,
      403: /acces/i,
      404: /găsit/i,
      409: /Conflict/i,
      422: /valid/i,
      429: /Prea multe/i,
      500: /server/i,
    };
    for (const status of HTTP_ERROR_DEMO_STATUSES) {
      expect(httpStatusFallbackMessage(status)).toMatch(expected[status]);
    }
  });
});

describe("safeNetworkErrorMessage", () => {
  it("maps abort / network failures to Romanian copy", () => {
    const abort = new Error("Aborted");
    abort.name = "AbortError";
    expect(safeNetworkErrorMessage(abort)).toMatch(/Conexiune/i);
    expect(safeNetworkErrorMessage(new Error("Network request failed"))).toMatch(/Conexiune/i);
  });

  it("keeps already user-facing API messages", () => {
    expect(safeNetworkErrorMessage(new Error("Resursa nu a fost găsită."))).toBe(
      "Resursa nu a fost găsită."
    );
  });
});
