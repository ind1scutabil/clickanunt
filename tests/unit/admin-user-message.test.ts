/** @jest-environment node */
/** POST /api/admin/users/[id]/message — permisiuni, validare, trimitere 1:1 */
import { NextRequest } from "next/server";

const mockGetUser = jest.fn();
const mockHasPermission = jest.fn();
const mockValidateSecure = jest.fn();
const mockFindUnique = jest.fn();
const mockSendDirect = jest.fn();
const mockAudit = jest.fn();
const mockAdminNotif = jest.fn();

jest.mock("@/lib/auth", () => ({
  getUserFromRequest: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock("@/lib/rbac", () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
  Permission: { MODERATION_REVIEW: "MODERATION_REVIEW" },
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: (...args: unknown[]) => mockValidateSecure(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/messaging/send-direct-peer-message", () => ({
  sendDirectPeerMessage: (...args: unknown[]) => mockSendDirect(...args),
  SendDirectPeerMessageError: class SendDirectPeerMessageError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock("@/lib/audit", () => ({
  createAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

jest.mock("@/lib/admin-notifications", () => ({
  createAdminNotification: (...args: unknown[]) => mockAdminNotif(...args),
}));

import { POST } from "@/app/api/admin/users/[id]/message/route";

function postMessage(targetUserId: string, body: { content: string }) {
  return POST(
    new NextRequest(`http://localhost/api/admin/users/${targetUserId}/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: targetUserId }) }
  );
}

describe("POST /api/admin/users/[id]/message", () => {
  const adminId = "admin-1";
  const targetId = "user-target";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: adminId, role: "admin", email: "admin@test.ro" });
    mockHasPermission.mockReturnValue(true);
    mockValidateSecure.mockResolvedValue({
      success: true,
      data: { content: "Salut din panoul admin." },
    });
    mockFindUnique.mockResolvedValue({
      id: targetId,
      email: "user@test.ro",
      deletedAt: null,
    });
    mockSendDirect.mockResolvedValue({
      conversationId: "conv-1",
      messageId: "msg-1",
      duplicate: false,
    });
  });

  it("returns 403 when not authenticated or without moderation permission", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await postMessage(targetId, { content: "x" });
    expect(res.status).toBe(403);

    mockGetUser.mockResolvedValue({ id: adminId, role: "user" });
    mockHasPermission.mockReturnValue(false);
    const res2 = await postMessage(targetId, { content: "x" });
    expect(res2.status).toBe(403);
  });

  it("returns 400 when messaging self", async () => {
    const res = await postMessage(adminId, { content: "x" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/propriul cont/i);
  });

  it("returns 404 for deleted or missing target user", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await postMessage(targetId, { content: "x" });
    expect(res.status).toBe(404);

    mockFindUnique.mockResolvedValue({
      id: targetId,
      email: "user@test.ro",
      deletedAt: new Date(),
    });
    const res2 = await postMessage(targetId, { content: "x" });
    expect(res2.status).toBe(404);
  });

  it("sends message only to selected user and audits", async () => {
    const res = await postMessage(targetId, { content: "Salut din panoul admin." });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.conversationId).toBe("conv-1");

    expect(mockSendDirect).toHaveBeenCalledWith({
      senderId: adminId,
      receiverId: targetId,
      content: "Salut din panoul admin.",
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_direct_message_sent",
        resourceId: "msg-1",
      })
    );
    expect(mockAdminNotif).toHaveBeenCalled();
  });

  it("propagates validation errors from secure middleware", async () => {
    mockValidateSecure.mockResolvedValue({
      success: false,
      error: "Mesajul este obligatoriu",
    });
    const res = await postMessage(targetId, { content: "" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Mesajul este obligatoriu");
    expect(mockSendDirect).not.toHaveBeenCalled();
  });
});
