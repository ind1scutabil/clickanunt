/** @jest-environment node */
/**
 * SSE/messaging auth must not accept JWT via ?token= (URL leak risk).
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {},
}));

jest.mock("@/lib/db", () => ({
  db: {
    findUserById: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  decodeAccessJwtPayload: jest.fn(),
}));

jest.mock("@/lib/jwt-normalize", () => ({
  normalizeJwtInput: (t: string) => (typeof t === "string" ? t.trim() : ""),
}));

import { NextRequest } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/messages-request-auth";
import { decodeAccessJwtPayload } from "@/lib/auth";
import { db } from "@/lib/db";

describe("getAuthUserIdFromRequest rejects query token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (decodeAccessJwtPayload as jest.Mock).mockResolvedValue({
      userId: "u-query",
      email: "a@b.c",
      role: "user",
      type: "access",
      sv: 0,
    });
    (db.findUserById as jest.Mock).mockResolvedValue({
      id: "u-query",
      isBanned: false,
      deletedAt: null,
      sessionVersion: 0,
    });
  });

  it("does not authenticate via ?token= alone", async () => {
    const req = new NextRequest(
      "http://localhost/api/messages/events?token=leaked-jwt"
    );
    await expect(getAuthUserIdFromRequest(req)).resolves.toBeNull();
    expect(decodeAccessJwtPayload).not.toHaveBeenCalled();
  });

  it("authenticates via cookie accessToken", async () => {
    const req = new NextRequest("http://localhost/api/messages/events", {
      headers: { cookie: "accessToken=cookie-jwt" },
    });
    await expect(getAuthUserIdFromRequest(req)).resolves.toBe("u-query");
    expect(decodeAccessJwtPayload).toHaveBeenCalledWith("cookie-jwt");
  });
});
