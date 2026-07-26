/** @jest-environment node */
/**
 * POST/DELETE /api/subscriptions — admin-only manual tier workflow.
 * Standard users must not self-grant Premium/Business.
 */
import { NextRequest } from "next/server";

const mockGetUser = jest.fn();
const mockValidateSecure = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockAudit = jest.fn();

jest.mock("@/lib/auth", () => ({
  getUserFromRequest: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: (...args: unknown[]) => mockValidateSecure(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/audit", () => ({
  createAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

import { GET, POST, DELETE } from "@/app/api/subscriptions/route";

const TARGET_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

function jsonReq(
  method: string,
  body?: Record<string, unknown>,
  search = ""
) {
  return new NextRequest(`http://localhost/api/subscriptions${search}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/subscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudit.mockResolvedValue(undefined);
  });

  describe("auth gates", () => {
    it("unauthenticated GET → 401", async () => {
      mockGetUser.mockResolvedValue(null);
      const res = await GET(jsonReq("GET"));
      expect(res.status).toBe(401);
    });

    it("unauthenticated POST → 401", async () => {
      mockGetUser.mockResolvedValue(null);
      const res = await POST(jsonReq("POST", { tier: "premium", userId: TARGET_ID }));
      expect(res.status).toBe(401);
    });

    it("standard user POST → 403", async () => {
      mockGetUser.mockResolvedValue({ id: USER_ID, role: "user", email: "u@test.ro" });
      const res = await POST(
        jsonReq("POST", { tier: "premium", userId: USER_ID })
      );
      expect(res.status).toBe(403);
      expect(mockValidateSecure).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("standard user DELETE → 403", async () => {
      mockGetUser.mockResolvedValue({ id: USER_ID, role: "user", email: "u@test.ro" });
      const res = await DELETE(jsonReq("DELETE", { userId: USER_ID }));
      expect(res.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("standard user cannot modify another user via POST", async () => {
      mockGetUser.mockResolvedValue({ id: USER_ID, role: "user", email: "u@test.ro" });
      const res = await POST(
        jsonReq("POST", { tier: "business", userId: OTHER_ID })
      );
      expect(res.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("admin POST", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        id: ADMIN_ID,
        role: "admin",
        email: "admin@test.ro",
      });
    });

    it("invalid CSRF → 403", async () => {
      mockValidateSecure.mockResolvedValue({
        success: false,
        csrfError: true,
        error: "Invalid CSRF",
      });
      const res = await POST(
        jsonReq("POST", { tier: "premium", userId: TARGET_ID })
      );
      expect(res.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("invalid tier → 400", async () => {
      mockValidateSecure.mockResolvedValue({
        success: false,
        error: "Validation failed",
      });
      const res = await POST(
        jsonReq("POST", { tier: "enterprise", userId: TARGET_ID } as never)
      );
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("authorized admin can set a valid tier and writes audit", async () => {
      mockValidateSecure.mockResolvedValue({
        success: true,
        data: { tier: "business", userId: TARGET_ID },
      });
      mockFindUnique.mockResolvedValue({
        id: TARGET_ID,
        subscriptionTier: "free",
        subscriptionExpiresAt: null,
        subscriptionRenewsAt: null,
        freeBoostsRemaining: 0,
      });
      mockUpdate.mockResolvedValue({
        subscriptionTier: "business",
        subscriptionExpiresAt: new Date("2030-01-01"),
        freeBoostsRemaining: 3,
      });

      const res = await POST(
        jsonReq("POST", { tier: "business", userId: TARGET_ID })
      );
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TARGET_ID },
          data: expect.objectContaining({ subscriptionTier: "business" }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "subscription.admin_set_tier",
          resourceId: TARGET_ID,
          details: expect.objectContaining({
            fromTier: "free",
            toTier: "business",
            targetUserId: TARGET_ID,
          }),
        })
      );
      const body = await res.json();
      expect(body.subscription.tier).toBe("business");
    });

    it("rejects mass-assignment of role / extra fields via schema failure", async () => {
      mockValidateSecure.mockResolvedValue({
        success: false,
        error: "Validation failed",
      });
      const res = await POST(
        jsonReq("POST", {
          tier: "premium",
          userId: TARGET_ID,
          role: "admin",
          subscriptionTier: "premium",
        } as never)
      );
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("GET own status only", () => {
    it("does not expose another user's data via userId query", async () => {
      mockGetUser.mockResolvedValue({
        id: USER_ID,
        role: "user",
        email: "u@test.ro",
      });
      const res = await GET(jsonReq("GET", undefined, `?userId=${OTHER_ID}`));
      expect(res.status).toBe(403);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("returns own normalized tier without plan prices", async () => {
      mockGetUser.mockResolvedValue({
        id: USER_ID,
        role: "user",
        email: "u@test.ro",
      });
      mockFindUnique.mockResolvedValue({
        subscriptionTier: "premium",
        subscriptionExpiresAt: null,
        subscriptionRenewsAt: null,
        freeBoostsRemaining: 2,
      });
      const res = await GET(jsonReq("GET"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tier).toBe("premium");
      expect(body.label).toBe("Premium");
      expect(body.plan).toBeUndefined();
      expect(body.price).toBeUndefined();
      expect(body.email).toBeUndefined();
      expect(body.password).toBeUndefined();
    });
  });

  describe("admin DELETE", () => {
    it("standard path already 403; admin cancel writes audit", async () => {
      mockGetUser.mockResolvedValue({
        id: ADMIN_ID,
        role: "owner",
        email: "owner@test.ro",
      });
      mockValidateSecure.mockResolvedValue({
        success: true,
        data: { userId: TARGET_ID },
      });
      mockFindUnique.mockResolvedValue({
        id: TARGET_ID,
        subscriptionTier: "premium",
        subscriptionExpiresAt: new Date("2030-01-01"),
        subscriptionRenewsAt: new Date("2030-01-01"),
      });
      mockUpdate.mockResolvedValue({
        subscriptionTier: "premium",
        subscriptionExpiresAt: new Date("2030-01-01"),
        subscriptionRenewsAt: null,
      });

      const res = await DELETE(jsonReq("DELETE", { userId: TARGET_ID }));
      expect(res.status).toBe(200);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "subscription.admin_cancel_renewal",
          resourceId: TARGET_ID,
        })
      );
    });
  });
});
