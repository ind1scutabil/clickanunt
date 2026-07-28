/** @jest-environment node */

describe("getPlatformLaunchDateDisplay", () => {
  const ENV_KEY = "NEXT_PUBLIC_PLATFORM_LAUNCH_DATE";
  const original = process.env[ENV_KEY];

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
    jest.resetModules();
  });

  it("returns null when no config value and no env var are set (TODO not yet filled in)", async () => {
    delete process.env[ENV_KEY];
    jest.resetModules();
    jest.doMock("@/lib/company-config", () => ({
      COMPANY_CONFIG: { platformLaunchDate: null },
      isCompanyLegalDetailsPublic: () => false,
    }));
    const { getPlatformLaunchDateDisplay } = await import("@/lib/company-public");
    expect(getPlatformLaunchDateDisplay()).toBeNull();
    jest.dontMock("@/lib/company-config");
  });

  it("formats a valid COMPANY_CONFIG.platformLaunchDate (YYYY-MM-DD) in Romanian", async () => {
    delete process.env[ENV_KEY];
    jest.resetModules();
    jest.doMock("@/lib/company-config", () => ({
      COMPANY_CONFIG: { platformLaunchDate: "2024-03-15" },
      isCompanyLegalDetailsPublic: () => false,
    }));
    const { getPlatformLaunchDateDisplay } = await import("@/lib/company-public");
    expect(getPlatformLaunchDateDisplay()).toBe("15 martie 2024");
    jest.dontMock("@/lib/company-config");
  });

  it("env var override takes precedence over COMPANY_CONFIG", async () => {
    process.env[ENV_KEY] = "2020-01-01";
    jest.resetModules();
    jest.doMock("@/lib/company-config", () => ({
      COMPANY_CONFIG: { platformLaunchDate: "2024-03-15" },
      isCompanyLegalDetailsPublic: () => false,
    }));
    const { getPlatformLaunchDateDisplay } = await import("@/lib/company-public");
    expect(getPlatformLaunchDateDisplay()).toBe("1 ianuarie 2020");
    jest.dontMock("@/lib/company-config");
  });

  it("returns null (fails soft) on an invalid/unparseable date string", async () => {
    delete process.env[ENV_KEY];
    jest.resetModules();
    jest.doMock("@/lib/company-config", () => ({
      COMPANY_CONFIG: { platformLaunchDate: "TODO" },
      isCompanyLegalDetailsPublic: () => false,
    }));
    const { getPlatformLaunchDateDisplay } = await import("@/lib/company-public");
    expect(getPlatformLaunchDateDisplay()).toBeNull();
    jest.dontMock("@/lib/company-config");
  });
});
