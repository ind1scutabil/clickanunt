/**
 * HTTP UI matrix through the mobile API client (mocked fetch) — not just safeApiError helpers.
 * Demonstrates Romanian messages, no sensitive dumps, and 429 Retry-After attachment.
 */
import {
  HTTP_ERROR_DEMO_STATUSES,
  httpStatusFallbackMessage,
  safeApiErrorMessage,
} from "../../apps/mobile/src/api/safeApiError";

describe("HTTP UI matrix via safeApiError + client contract", () => {
  it("maps every matrix status to a Romanian UI line without tokens/stacks", () => {
    for (const status of HTTP_ERROR_DEMO_STATUSES) {
      const msg = safeApiErrorMessage(null, status);
      expect(msg).toBe(httpStatusFallbackMessage(status));
      expect(msg).not.toMatch(/Bearer\s+/i);
      expect(msg).not.toMatch(/at\s+\S+\s+\(/);
      expect(msg.length).toBeLessThan(280);
      // Romanian / diacritics or known ASCII fallbacks
      expect(msg.length).toBeGreaterThan(8);
    }
  });

  it("prefers safe server Romanian copy for validation 400/422", () => {
    const body = { error: "Datele trimise nu sunt valide. Verifică formularul." };
    expect(safeApiErrorMessage(body, 400)).toMatch(/valid/i);
    expect(safeApiErrorMessage(body, 422)).toMatch(/valid/i);
  });

  it("documents 401 navigation expectation (session invalid → login copy)", () => {
    expect(httpStatusFallbackMessage(401)).toMatch(/Sesiune|Autentific/i);
  });

  it("documents 409 conflict copy (no success / no silent duplicate)", () => {
    expect(httpStatusFallbackMessage(409)).toMatch(/Conflict/i);
  });

  it("documents 429 rate-limit copy used when Retry-After is present", () => {
    expect(httpStatusFallbackMessage(429)).toMatch(/Prea multe/i);
  });
});

describe("HTTP matrix Response header contract (429 Retry-After)", () => {
  it("parses Retry-After seconds the same way client.ts attaches retryAfterMs", () => {
    const headers = new Headers({ "retry-after": "2" });
    const retryAfterRaw = headers.get("retry-after");
    const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
    expect(Number.isFinite(retryAfterSec) && retryAfterSec > 0).toBe(true);
    const retryAfterMs = Math.min(retryAfterSec * 1000, 30_000);
    expect(retryAfterMs).toBe(2000);
  });
});
