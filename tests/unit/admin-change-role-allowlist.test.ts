/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/audit", () => ({
  auditActions: {
    userRoleChanged: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: jest.fn(),
}));

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { PUT as changeRole } from "@/app/api/admin/users/[id]/role/route";

describe("admin change role allowlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects non-allowlisted role string", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "a1",
      email: "admin@example.com",
      role: "owner",
    });
    (validateSecureRequest as jest.Mock).mockResolvedValue({
      success: false,
      validationError: true,
      error: "Invalid input",
    });

    const req = new NextRequest("http://localhost/api/admin/users/u1/role", {
      method: "PUT",
      body: JSON.stringify({ role: "superadmin", emailVerified: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await changeRole(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test("standard user cannot change roles", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "u@example.com",
      role: "user",
    });
    const req = new NextRequest("http://localhost/api/admin/users/u2/role", {
      method: "PUT",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await changeRole(req, { params: Promise.resolve({ id: "u2" }) });
    expect(res.status).toBe(403);
  });
});
