/** @jest-environment node */
/**
 * P0 lock: /api/users/[id] must not be anonymously readable/writable/deletable.
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    listing: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (ops: unknown) => ops),
  },
}));

jest.mock("@/lib/auth", () => ({
  getUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(),
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: jest.fn(async () => ({
    success: true,
    data: {},
  })),
}));

import { GET, PATCH, DELETE } from "@/app/api/users/[id]/route";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ID = "11111111-1111-4111-8111-111111111111";

function req(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/users/${ID}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET/PATCH/DELETE /api/users/[id] auth lock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects anonymous GET", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await GET(req("GET"), { params: Promise.resolve({ id: ID }) });
    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects anonymous PATCH role spoof", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(req("PATCH", { role: "admin" }), {
      params: Promise.resolve({ id: ID }),
    });
    expect(res.status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects anonymous hard DELETE", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(req("DELETE"), {
      params: Promise.resolve({ id: ID }),
    });
    expect(res.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("admin soft-deletes instead of prisma.user.delete", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "admin-1",
      role: "admin",
      email: "a@example.com",
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: ID,
      role: "user",
      deletedAt: null,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.listing.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await DELETE(req("DELETE"), {
      params: Promise.resolve({ id: ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.softDeleted).toBe(true);
    expect(body.hardDeleteRefused ?? true).toBeTruthy();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
