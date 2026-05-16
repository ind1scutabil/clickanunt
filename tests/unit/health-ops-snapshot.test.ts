import { getHealthOpsSnapshot } from "@/lib/infra/health-ops-snapshot";

describe("getHealthOpsSnapshot", () => {
  const orig = process.env.ENABLE_PRODUCTION_HEALTH_OPS;

  afterEach(() => {
    if (orig === undefined) delete process.env.ENABLE_PRODUCTION_HEALTH_OPS;
    else process.env.ENABLE_PRODUCTION_HEALTH_OPS = orig;
  });

  it("returns process memory without secrets when ops enabled", () => {
    process.env.ENABLE_PRODUCTION_HEALTH_OPS = "1";
    const snap = getHealthOpsSnapshot();
    expect(snap.process.heapUsedMb).toBeGreaterThan(0);
    expect(snap.process.rssMb).toBeGreaterThan(0);
    expect(snap.process.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(snap).not.toHaveProperty("env");
  });

  it("can include disk and uploads when requested", () => {
    process.env.ENABLE_PRODUCTION_HEALTH_OPS = "1";
    const snap = getHealthOpsSnapshot({
      includeDisk: true,
      includeUploadsDir: true,
    });
    expect(snap.uploads).toBeDefined();
    expect(typeof snap.uploads?.exists).toBe("boolean");
  });
});
