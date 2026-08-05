/** @jest-environment node */
/**
 * POST /api/messages/[userId] — listing seller derivation, self-block, spoof reject.
 */
import { NextRequest } from "next/server";

const mockAuth = jest.fn();
const mockValidate = jest.fn();
const mockListingFind = jest.fn();
const mockUserFind = jest.fn();
const mockConvFindFirst = jest.fn();
const mockConvFindUnique = jest.fn();
const mockConvCreate = jest.fn();
const mockConvUpdate = jest.fn();
const mockMsgFindFirst = jest.fn();
const mockMsgCreate = jest.fn();
const mockPublish = jest.fn();
const mockSse = jest.fn();

jest.mock("@/lib/messages-request-auth", () => ({
  getMessagingApiAuthPayload: (...a: unknown[]) => mockAuth(...a),
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: (...a: unknown[]) => mockValidate(...a),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findUnique: (...a: unknown[]) => mockListingFind(...a) },
    user: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
    conversation: {
      findFirst: (...a: unknown[]) => mockConvFindFirst(...a),
      findUnique: (...a: unknown[]) => mockConvFindUnique(...a),
      create: (...a: unknown[]) => mockConvCreate(...a),
      update: (...a: unknown[]) => mockConvUpdate(...a),
    },
    message: {
      findFirst: (...a: unknown[]) => mockMsgFindFirst(...a),
      create: (...a: unknown[]) => mockMsgCreate(...a),
    },
  },
}));

jest.mock("@/lib/messaging-sse-hub", () => ({
  messagingPublishSse: (...a: unknown[]) => mockSse(...a),
  publishToUsers: (...a: unknown[]) => mockPublish(...a),
}));

jest.mock("@/lib/analytics-events", () => ({
  ANALYTICS_EVENT: { message_sent: "message_sent" },
  recordAnalyticsEvent: jest.fn(),
}));

jest.mock("@/lib/admin-notifications", () => ({
  createAdminNotification: jest.fn(),
}));

jest.mock("@/lib/admin-notification-types", () => ({
  ADMIN_NOTIFICATION_TYPE: { CONVERSATION_NEW: "conversation_new" },
}));

jest.mock("@/lib/messaging-observability", () => ({
  messagingRequestCorrelation: () => ({ requestId: "t" }),
  messagingStructuredLog: jest.fn(),
}));

jest.mock("@/lib/messaging-prometheus", () => ({
  promObserveHttpMessagePost: jest.fn(),
}));

jest.mock("@/lib/messaging-content", () => ({
  normalizeMessagingContent: (s: string) => String(s || "").trim(),
}));

import { POST } from "@/app/api/messages/[userId]/route";

const buyer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const spoof = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const listingId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function postMsg(peerId: string, body: Record<string, unknown>) {
  return POST(
    new NextRequest(`http://localhost/api/messages/${peerId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ userId: peerId }) }
  );
}

describe("POST /api/messages/[userId] listing contact security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: buyer });
    mockValidate.mockResolvedValue({
      success: true,
      data: { content: "Salut, e disponibil?", listingId },
    });
    mockUserFind.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === buyer) {
        return { isBanned: false, deletedAt: null };
      }
      if (where.id === owner) {
        return {
          id: owner,
          email: "owner@example.com",
          name: "Owner",
          avatar: null,
          role: "user",
          isBanned: false,
          deletedAt: null,
        };
      }
      return null;
    });
    mockConvFindFirst.mockResolvedValue(null);
    mockMsgFindFirst.mockResolvedValue(null);
    mockConvCreate.mockResolvedValue({
      id: "conv-1",
      listingId,
      participant1Id: buyer,
      participant2Id: owner,
    });
    mockMsgCreate.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: buyer,
      receiverId: owner,
      content: "Salut, e disponibil?",
      sender: { id: buyer, name: "Buyer", avatar: null, role: "user" },
      receiver: { id: owner, name: "Owner", avatar: null, role: "user" },
    });
    mockConvUpdate.mockResolvedValue({});
  });

  it("rejects recipient spoof for listing-scoped create", async () => {
    mockListingFind.mockResolvedValue({
      id: listingId,
      ownerUserId: owner,
      status: "active",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
    });
    const res = await postMsg(spoof, { content: "x", listingId });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/proprietar/i);
    expect(mockConvCreate).not.toHaveBeenCalled();
  });

  it("rejects new conversation on paused listing", async () => {
    mockValidate.mockResolvedValue({
      success: true,
      data: { content: "Salut", listingId },
    });
    mockListingFind.mockResolvedValue({
      id: listingId,
      ownerUserId: owner,
      status: "paused",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
    });
    const res = await postMsg(owner, { content: "Salut", listingId });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/nu poate fi contactat/i);
  });

  it("rejects self DM without listing", async () => {
    mockValidate.mockResolvedValue({
      success: true,
      data: { content: "hello self" },
    });
    const res = await postMsg(buyer, { content: "hello self" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/propriul cont/i);
  });

  it("creates listing conversation when peer is owner", async () => {
    mockListingFind.mockResolvedValue({
      id: listingId,
      ownerUserId: owner,
      status: "active",
      moderationStatus: "approved",
      deletedAt: null,
      expiresAt: null,
    });
    const res = await postMsg(owner, { content: "Salut, e disponibil?", listingId });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockConvCreate).toHaveBeenCalled();
    expect(body.message?.receiver?.email).toBeUndefined();
  });
});
