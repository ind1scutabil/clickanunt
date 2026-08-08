/**
 * @jest-environment node
 *
 * Regression cover for the SSR view-counting regression: the detail page is
 * server-rendered, so nothing calls GET /api/listings/[id] on a normal visit and the
 * counter froze. Counting now happens only through recordListingView.
 */

import type { NextRequest } from "next/server";

const resolveRateLimit = jest.fn();

type FakeEvent = {
  id: string;
  eventType: string;
  sessionId: string | null;
  listingId: string | null;
  createdAt: Date;
};

const db = {
  views: new Map<string, number>(),
  events: [] as FakeEvent[],
  /** Records the order of operations inside a transaction. */
  trace: [] as string[],
  /** Serialises transactions the way pg_advisory_xact_lock does per key. */
  locks: new Map<string, Promise<void>>(),
  /** When true, analyticsEvent.create throws to exercise rollback. */
  failEventCreate: false,
};

function makeTxClient(snapshot: { views: Map<string, number>; events: FakeEvent[] }) {
  return {
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      db.trace.push(`lock:${String(values[0])}`);
      const sql = strings.join("");
      expect(sql).toContain("pg_advisory_xact_lock");
      expect(sql).toContain("hashtextextended");
      expect(sql).not.toContain("hashtext(");
      return 1;
    },
    analyticsEvent: {
      findFirst: async ({ where }: any) => {
        db.trace.push("dedupe-check");
        const since: Date = where.createdAt.gte;
        return (
          snapshot.events.find(
            (e) =>
              e.eventType === where.eventType &&
              e.sessionId === where.sessionId &&
              e.listingId === where.listingId &&
              e.createdAt >= since,
          ) ?? null
        );
      },
      create: async ({ data }: any) => {
        db.trace.push("event-create");
        if (db.failEventCreate) {
          throw new Error("analyticsEvent.create failed");
        }
        const row: FakeEvent = {
          id: `evt-${snapshot.events.length + 1}`,
          eventType: data.eventType,
          sessionId: data.sessionId ?? null,
          listingId: data.listingId ?? null,
          createdAt: new Date(),
        };
        snapshot.events.push(row);
        return row;
      },
    },
    analyticsSession: {
      upsert: async () => ({}),
    },
    listing: {
      findUnique: async ({ where }: any) => {
        const v = snapshot.views.get(where.id);
        return v === undefined ? null : { views: v };
      },
      update: async ({ where }: any) => {
        db.trace.push("increment");
        const next = (snapshot.views.get(where.id) ?? 0) + 1;
        snapshot.views.set(where.id, next);
        return { views: next };
      },
    },
  };
}

const prismaMock = {
  listing: {
    findUnique: async ({ where }: any) => {
      const v = db.views.get(where.id);
      return v === undefined ? null : { views: v };
    },
    update: async ({ where }: any) => {
      // Outside a transaction this must never run for view counting.
      const next = (db.views.get(where.id) ?? 0) + 1;
      db.views.set(where.id, next);
      return { views: next };
    },
  },
  /**
   * Interactive transaction. The advisory lock in the real implementation serialises
   * same-key transactions, so the fake serialises every transaction too — a callback
   * only starts once the previous one committed. On throw, mutations are discarded.
   */
  $transaction: async (cb: (tx: any) => Promise<unknown>) => {
    const previous = db.locks.get("global") ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((r) => {
      release = r;
    });
    db.locks.set(
      "global",
      previous.then(() => current),
    );
    await previous;
    const snapshot = {
      views: new Map(db.views),
      events: db.events.map((e) => ({ ...e })),
    };
    try {
      const result = await cb(makeTxClient(snapshot));
      db.views.clear();
      for (const [k, v] of snapshot.views) db.views.set(k, v);
      db.events.length = 0;
      db.events.push(...snapshot.events);
      return result;
    } catch (err) {
      // Rollback: discard snapshot mutations.
      throw err;
    } finally {
      release();
    }
  },
};

// Getter keeps the reference lazy — jest.mock factories are hoisted above the consts.
jest.mock("@/lib/prisma", () => ({
  get prisma() {
    return prismaMock;
  },
}));

jest.mock("@/lib/rate-limit-distributed", () => ({
  resolveRateLimit: (...args: unknown[]) => resolveRateLimit(...args),
}));

jest.mock("@/lib/rateLimit", () => ({
  getClientIp: () => "203.0.113.50",
}));

import { recordListingView } from "@/lib/listings/record-listing-view";
import * as recorderSource from "fs";
import * as path from "path";

const LISTING = "11111111-2222-3333-4444-555555555555";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function req(opts?: { sessionId?: string; ua?: string; bodySessionId?: string }): NextRequest {
  const headers = new Headers();
  headers.set("user-agent", opts?.ua ?? BROWSER_UA);
  if (opts?.sessionId) headers.set("x-analytics-session-id", opts.sessionId);
  const init: RequestInit = { method: "POST", headers };
  if (opts?.bodySessionId) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify({ sessionId: opts.bodySessionId });
  }
  return new Request(`http://localhost/api/listings/${LISTING}/view`, init) as NextRequest;
}

function record(opts: {
  sessionId?: string;
  ua?: string;
  isOwnerOrAdmin?: boolean;
  bodySessionId?: string;
}) {
  return recordListingView({
    request: req({
      sessionId: opts.sessionId,
      ua: opts.ua,
      bodySessionId: opts.bodySessionId,
    }),
    listingId: LISTING,
    viewerId: null,
    isOwnerOrAdmin: opts.isOwnerOrAdmin ?? false,
  });
}

describe("recordListingView", () => {
  beforeEach(() => {
    db.views.clear();
    db.views.set(LISTING, 0);
    db.events.length = 0;
    db.trace.length = 0;
    db.locks.clear();
    db.failEventCreate = false;
    resolveRateLimit.mockReset();
    resolveRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
    });
  });

  it("counts a normal first visit and returns the authoritative value", async () => {
    const res = await record({ sessionId: "sess-a" });
    expect(res).toEqual({ counted: true, views: 1 });
    expect(db.views.get(LISTING)).toBe(1);
  });

  it("writes exactly one listing_view event per counted view", async () => {
    await record({ sessionId: "sess-a" });
    expect(db.events.filter((e) => e.eventType === "listing_view")).toHaveLength(1);
  });

  it("acquires the advisory lock before checking for duplicates", async () => {
    await record({ sessionId: "sess-a" });
    expect(db.trace[0]).toBe(`lock:listing_view:${LISTING}:sess-a`);
    expect(db.trace.indexOf("dedupe-check")).toBeGreaterThan(0);
    expect(db.trace.indexOf("event-create")).toBeGreaterThan(db.trace.indexOf("dedupe-check"));
    expect(db.trace.indexOf("increment")).toBeGreaterThan(db.trace.indexOf("event-create"));
  });

  it("uses hashtextextended for a full bigint advisory lock key", () => {
    const src = recorderSource.readFileSync(
      path.join(process.cwd(), "lib/listings/record-listing-view.ts"),
      "utf8",
    );
    expect(src).toContain("hashtextextended(${lockKey}, 0)");
    expect(src).not.toMatch(/hashtext\(\$\{lockKey\}\)::bigint/);
  });

  it("deduplicates a refresh in the same session and reports the current value", async () => {
    const first = await record({ sessionId: "sess-a" });
    const second = await record({ sessionId: "sess-a" });

    expect(first).toEqual({ counted: true, views: 1 });
    expect(second.counted).toBe(false);
    expect(second.views).toBe(1);
    expect(second.reason).toBe("duplicate");
    expect(db.views.get(LISTING)).toBe(1);
  });

  it("counts a different session", async () => {
    await record({ sessionId: "sess-a" });
    const other = await record({ sessionId: "sess-b" });
    expect(other).toEqual({ counted: true, views: 2 });
    expect(db.views.get(LISTING)).toBe(2);
  });

  it("two concurrent requests in one session increment exactly once", async () => {
    const [a, b] = await Promise.all([
      record({ sessionId: "race" }),
      record({ sessionId: "race" }),
    ]);

    expect([a.counted, b.counted].filter(Boolean)).toHaveLength(1);
    expect(db.views.get(LISTING)).toBe(1);
    expect(db.events.filter((e) => e.eventType === "listing_view")).toHaveLength(1);
    expect(a.views).toBe(1);
    expect(b.views).toBe(1);
  });

  it("20 concurrent requests in one session increment exactly once", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => record({ sessionId: "race-20" })),
    );

    expect(results.filter((r) => r.counted)).toHaveLength(1);
    expect(db.views.get(LISTING)).toBe(1);
    expect(db.events.filter((e) => e.eventType === "listing_view")).toHaveLength(1);
    expect(results.every((r) => r.views === 1)).toBe(true);
  });

  it("20 concurrent requests with different sessions increment exactly +20", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => record({ sessionId: `sess-${i}` })),
    );

    expect(results.filter((r) => r.counted)).toHaveLength(20);
    expect(db.views.get(LISTING)).toBe(20);
    expect(db.events.filter((e) => e.eventType === "listing_view")).toHaveLength(20);
  });

  it("20 concurrent requests without a session id increment exactly +0", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => record({})));

    expect(results.every((r) => r.counted === false)).toBe(true);
    expect(results.every((r) => r.reason === "missing_session")).toBe(true);
    expect(results.every((r) => r.views === 0)).toBe(true);
    expect(db.views.get(LISTING)).toBe(0);
    expect(db.events).toHaveLength(0);
  });

  it("does not accept a session id from the JSON body", async () => {
    const res = await record({ bodySessionId: "body-sess-should-be-ignored" });
    expect(res).toEqual({ counted: false, views: 0, reason: "missing_session" });
    expect(db.views.get(LISTING)).toBe(0);
    expect(db.events).toHaveLength(0);
  });

  it("never uses an IP-only increment path", () => {
    const src = recorderSource.readFileSync(
      path.join(process.cwd(), "lib/listings/record-listing-view.ts"),
      "utf8",
    );
    expect(src).not.toContain("listing:view:iphash:");
    expect(src).not.toContain("listing:view:nosession:");
    expect(src).toContain('reason: "missing_session"');
  });

  it("repeat inside the dedupe window adds +0; a new session adds +1", async () => {
    const first = await record({ sessionId: "window-a" });
    const repeat = await record({ sessionId: "window-a" });
    const fresh = await record({ sessionId: "window-b" });

    expect(first).toEqual({ counted: true, views: 1 });
    expect(repeat.counted).toBe(false);
    expect(repeat.views).toBe(1);
    expect(fresh).toEqual({ counted: true, views: 2 });
    expect(db.views.get(LISTING)).toBe(2);
  });

  it("never counts the owner or an admin", async () => {
    const res = await record({ sessionId: "owner-sess", isOwnerOrAdmin: true });
    expect(res.counted).toBe(false);
    expect(res.reason).toBe("owner");
    expect(db.views.get(LISTING)).toBe(0);
  });

  it("never counts a declared bot", async () => {
    const res = await record({ sessionId: "bot-sess", ua: "Googlebot/2.1" });
    expect(res.counted).toBe(false);
    expect(res.reason).toBe("automation");
    expect(db.views.get(LISTING)).toBe(0);
  });

  it("does not count when the per-IP browse limit is exhausted", async () => {
    resolveRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 1000,
      retryAfter: 60,
    });
    const res = await record({ sessionId: "sess-a" });
    expect(res.counted).toBe(false);
    expect(res.reason).toBe("rate_limited");
    expect(db.views.get(LISTING)).toBe(0);
  });

  it("returns not_found without touching counters for a missing listing", async () => {
    db.views.delete(LISTING);
    const res = await record({ sessionId: "sess-a" });
    expect(res).toEqual({ counted: false, views: 0, reason: "not_found" });
  });

  it("rolls back the counter when analyticsEvent.create fails", async () => {
    db.failEventCreate = true;
    await expect(record({ sessionId: "sess-fail" })).rejects.toThrow(
      "analyticsEvent.create failed",
    );
    expect(db.views.get(LISTING)).toBe(0);
    expect(db.events).toHaveLength(0);

    db.failEventCreate = false;
    const ok = await record({ sessionId: "sess-ok" });
    expect(ok).toEqual({ counted: true, views: 1 });
    expect(db.events).toHaveLength(1);
  });
});
