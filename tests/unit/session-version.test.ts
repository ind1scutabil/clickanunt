/** @jest-environment node */

import {
  isSessionVersionMatch,
  sessionVersionFromTokenPayload,
  sessionVersionFromUser,
} from "@/lib/auth/session-version";

describe("sessionVersion helpers", () => {
  it("treats missing claim as 0 (legacy JWT)", () => {
    expect(sessionVersionFromTokenPayload({})).toBe(0);
    expect(sessionVersionFromTokenPayload({ sv: undefined })).toBe(0);
  });

  it("parses numeric and numeric-string sv", () => {
    expect(sessionVersionFromTokenPayload({ sv: 3 })).toBe(3);
    expect(sessionVersionFromTokenPayload({ sv: "7" })).toBe(7);
    expect(sessionVersionFromTokenPayload({ sv: "nope" })).toBe(0);
  });

  it("reads user sessionVersion with safe default", () => {
    expect(sessionVersionFromUser({})).toBe(0);
    expect(sessionVersionFromUser({ sessionVersion: null })).toBe(0);
    expect(sessionVersionFromUser({ sessionVersion: 2 })).toBe(2);
  });

  it("matches only equal versions", () => {
    expect(isSessionVersionMatch(0, 0)).toBe(true);
    expect(isSessionVersionMatch(1, 2)).toBe(false);
  });
});
