/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userNotification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/security/middleware", () => ({
  validateSecureRequest: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { POST as markOneRead } from "@/app/api/notifications/[id]/read/route";
import { POST as markAllRead } from "@/app/api/notifications/mark-all-read/route";
import { GET as listNotifications } from "@/app/api/notifications/route";

describe("user notification ownership + mark-read", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateSecureRequest as jest.Mock).mockResolvedValue({ success: true });
  });

  it("GET returns only caller notifications + unreadCount", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({ id: "user-a" });
    (prisma.userNotification.findMany as jest.Mock).mockResolvedValue([
      {
        id: "n1",
        userId: "user-a",
        broadcastId: null,
        title: "t",
        message: "m",
        isRead: false,
        readAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    (prisma.userNotification.count as jest.Mock).mockResolvedValue(1);

    const res = await listNotifications(
      new NextRequest("http://localhost/api/notifications")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unreadCount).toBe(1);
    expect(body.notifications).toHaveLength(1);
    expect(prisma.userNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-a" } })
    );
  });

  it("mark-one-read 404 when notification belongs to another user", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({ id: "user-a" });
    (prisma.userNotification.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await markOneRead(
      new NextRequest("http://localhost/api/notifications/n-other/read", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "n-other" }) }
    );
    expect(res.status).toBe(404);
    expect(prisma.userNotification.update).not.toHaveBeenCalled();
  });

  it("mark-one-read updates only owner row", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({ id: "user-a" });
    (prisma.userNotification.findFirst as jest.Mock).mockResolvedValue({
      id: "n1",
      isRead: false,
    });
    (prisma.userNotification.update as jest.Mock).mockResolvedValue({
      id: "n1",
      isRead: true,
      readAt: new Date("2026-01-02T00:00:00Z"),
    });

    const res = await markOneRead(
      new NextRequest("http://localhost/api/notifications/n1/read", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "n1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.userNotification.findFirst).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-a" },
      select: { id: true, isRead: true },
    });
  });

  it("mark-all-read scopes updateMany to caller", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({ id: "user-a" });
    (prisma.userNotification.updateMany as jest.Mock).mockResolvedValue({
      count: 3,
    });

    const res = await markAllRead(
      new NextRequest("http://localhost/api/notifications/mark-all-read", {
        method: "POST",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(3);
    expect(prisma.userNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-a", isRead: false },
      data: expect.objectContaining({ isRead: true }),
    });
  });

  it("rejects unauthenticated mark-all-read", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await markAllRead(
      new NextRequest("http://localhost/api/notifications/mark-all-read", {
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
  });
});
