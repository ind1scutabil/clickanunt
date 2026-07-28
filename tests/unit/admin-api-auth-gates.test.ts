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
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("@/lib/metrics", () => ({
  metricsCollector: {
    getMetrics: () => ({
      timestamp: Date.now(),
      availability: 1,
      errorRate: 0,
      latency: { p50: 1, p95: 2, p99: 3, mean: 1.5 },
      requests: { total: 1, successful: 1, failed: 0 },
    }),
  },
}));

jest.mock("@/lib/alerts", () => ({
  alertManager: {
    getAlertSummary: () => ({ active: 0 }),
    getActiveAlerts: () => [],
  },
}));

jest.mock("@/lib/slo", () => ({
  SLOs: {
    AVAILABILITY: { target: 0.99 },
    ERROR_RATE: { target: 0.99 },
    P95_LATENCY: { target: 500 },
  },
}));

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET as statusGet } from "@/app/api/admin/status/route";
import { GET as metricsGet } from "@/app/api/admin/metrics/dashboard/route";

describe("admin API auth gates (status + metrics)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/admin/status returns 401 without session", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await statusGet(new NextRequest("http://localhost/api/admin/status"));
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/status returns 403 for standard user", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "u@example.com",
      role: "user",
    });
    const res = await statusGet(new NextRequest("http://localhost/api/admin/status"));
    expect(res.status).toBe(403);
  });

  test("GET /api/admin/status returns counts without email list for admin", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "a1",
      email: "admin@example.com",
      role: "admin",
    });
    (prisma.user.count as jest.Mock)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const res = await statusGet(new NextRequest("http://localhost/api/admin/status"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.adminCount).toBe(2);
    expect(body.ownerCount).toBe(1);
    expect(body.admins).toBeUndefined();
  });

  test("GET /api/admin/metrics/dashboard returns 401 without session", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue(null);
    const res = await metricsGet(
      new NextRequest("http://localhost/api/admin/metrics/dashboard")
    );
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/metrics/dashboard returns 403 for standard user", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "u@example.com",
      role: "user",
    });
    const res = await metricsGet(
      new NextRequest("http://localhost/api/admin/metrics/dashboard")
    );
    expect(res.status).toBe(403);
  });

  test("GET /api/admin/metrics/dashboard ok for admin", async () => {
    (getUserFromRequest as jest.Mock).mockResolvedValue({
      id: "a1",
      email: "admin@example.com",
      role: "admin",
    });
    const res = await metricsGet(
      new NextRequest("http://localhost/api/admin/metrics/dashboard")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.health?.status).toBeDefined();
  });
});
