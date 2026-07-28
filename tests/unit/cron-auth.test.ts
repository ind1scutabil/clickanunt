/** @jest-environment node */
import { NextRequest } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";

describe("authorizeCronRequest", () => {
  const prev = process.env.CRON_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("returns 503 when CRON_SECRET is unset (fail-closed)", () => {
    delete process.env.CRON_SECRET;
    const res = authorizeCronRequest(
      new NextRequest("http://localhost/api/cron/expire-promotions")
    );
    expect(res?.status).toBe(503);
  });

  it("returns 401 without Authorization", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = authorizeCronRequest(
      new NextRequest("http://localhost/api/cron/expire-promotions")
    );
    expect(res?.status).toBe(401);
  });

  it("returns 401 for wrong Bearer secret", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = authorizeCronRequest(
      new NextRequest("http://localhost/api/cron/expire-promotions", {
        headers: { authorization: "Bearer wrong" },
      })
    );
    expect(res?.status).toBe(401);
  });

  it("ignores query-string secret and still requires header", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = authorizeCronRequest(
      new NextRequest(
        "http://localhost/api/cron/expire-promotions?secret=test-cron-secret"
      )
    );
    expect(res?.status).toBe(401);
  });

  it("allows Bearer CRON_SECRET", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = authorizeCronRequest(
      new NextRequest("http://localhost/api/cron/expire-promotions", {
        headers: { authorization: "Bearer test-cron-secret" },
      })
    );
    expect(res).toBeNull();
  });

  it("allows x-cron-secret header", () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = authorizeCronRequest(
      new NextRequest("http://localhost/api/cron/expire-promotions", {
        headers: { "x-cron-secret": "test-cron-secret" },
      })
    );
    expect(res).toBeNull();
  });
});
