/** @jest-environment node */
/**
 * Banned / soft-deleted users must not obtain messaging auth payloads.
 */
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
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { decodeAccessJwtPayload } from "@/lib/auth";
import { db } from "@/lib/db";

describe("messaging auth rejects banned/deleted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when user is banned", async () => {
    (decodeAccessJwtPayload as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a@b.c",
      role: "user",
      type: "access",
    });
    (db.findUserById as jest.Mock).mockResolvedValue({
      id: "u1",
      isBanned: true,
      deletedAt: null,
    });

    const req = new NextRequest("http://localhost/api/messages", {
      headers: { authorization: "Bearer tok" },
    });
    await expect(getMessagingApiAuthPayload(req)).resolves.toBeNull();
  });

  it("returns null when user is soft-deleted", async () => {
    (decodeAccessJwtPayload as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a@b.c",
      role: "user",
      type: "access",
    });
    (db.findUserById as jest.Mock).mockResolvedValue({
      id: "u1",
      isBanned: false,
      deletedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/messages", {
      headers: { authorization: "Bearer tok" },
    });
    await expect(getMessagingApiAuthPayload(req)).resolves.toBeNull();
  });

  it("returns payload for active user", async () => {
    const payload = {
      userId: "u1",
      email: "a@b.c",
      role: "user",
      type: "access",
    };
    (decodeAccessJwtPayload as jest.Mock).mockResolvedValue(payload);
    (db.findUserById as jest.Mock).mockResolvedValue({
      id: "u1",
      isBanned: false,
      deletedAt: null,
    });

    const req = new NextRequest("http://localhost/api/messages", {
      headers: { authorization: "Bearer tok" },
    });
    await expect(getMessagingApiAuthPayload(req)).resolves.toEqual(payload);
  });
});
