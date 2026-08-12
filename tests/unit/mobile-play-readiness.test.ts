/** @jest-environment node */
/**
 * Locks Android/Expo Play-readiness facts that must stay 1:1 with the live site brand.
 * Does not invent FCM, assetlinks fingerprints, or store screenshots.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOBILE = path.join(ROOT, "apps/mobile");

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(MOBILE, rel), "utf8")) as Record<string, unknown>;
}

describe("mobile Play readiness (no invented store/FCM secrets)", () => {
  it("wires brand icons/splash from committed assets matching public/brand icon hash path", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    expect(app.icon).toBe("./assets/icon.png");
    expect(app.name).toBe("ClickAnunț");
    const splash = app.splash as Record<string, unknown>;
    expect(splash.image).toBe("./assets/splash-icon.png");
    expect(splash.backgroundColor).toBe("#111111");
    const android = app.android as Record<string, unknown>;
    const adaptive = android.adaptiveIcon as Record<string, unknown>;
    expect(adaptive.foregroundImage).toBe("./assets/adaptive-icon.png");
    expect(adaptive.backgroundColor).toBe("#111111");
    for (const f of [
      "assets/icon.png",
      "assets/adaptive-icon.png",
      "assets/splash-icon.png",
      "assets/play-feature-graphic.png",
    ]) {
      expect(fs.existsSync(path.join(MOBILE, f))).toBe(true);
    }
  });

  it("keeps package + siteUrl identical to production web identity", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    const android = app.android as Record<string, unknown>;
    const extra = app.extra as Record<string, unknown>;
    expect(android.package).toBe("ro.clickanunt.mobile");
    expect(android.versionCode).toBe(3);
    expect(extra.siteUrl).toBe("https://www.clickanunt.ro");
  });

  it("declares only camera permission for capture; Android Photo Picker needs no READ_MEDIA_IMAGES", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    const android = app.android as Record<string, unknown>;
    expect(android.permissions).toEqual(["CAMERA"]);
    expect(android.blockedPermissions).toEqual(
      expect.arrayContaining([
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
      ])
    );
    const ios = app.ios as Record<string, unknown>;
    const info = ios.infoPlist as Record<string, unknown>;
    expect(info.NSMicrophoneUsageDescription).toBeUndefined();
    expect(info.NSCameraUsageDescription).toEqual(expect.stringContaining("ClickAnunț"));
  });

  it("exposes Android EAS build/submit scripts and draft internal submit track", () => {
    const pkg = readJson("package.json");
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts["build:android:prod"]).toContain("eas-cli@18.0.5 build --platform android");
    expect(scripts["submit:android:prod"]).toContain("eas-cli@18.0.5 submit --platform android");
    const eas = readJson("eas.json");
    const submit = (eas.submit as Record<string, unknown>).production as Record<string, unknown>;
    const android = submit.android as Record<string, unknown>;
    expect(android.track).toBe("internal");
    expect(android.releaseStatus).toBe("draft");
  });

  it("LoginScreen and Account open live /privacy and /terms (not invented URLs)", () => {
    const login = fs.readFileSync(path.join(MOBILE, "src/screens/LoginScreen.tsx"), "utf8");
    expect(login).toContain("openSitePath('/privacy')");
    expect(login).toContain("openSitePath('/terms')");
    expect(login).toContain("openSitePath('/auth/forgot-password')");
    expect(login).toContain("Anunțuri gratuite în România");
    expect(login).not.toContain("Enterprise Mobile Experience");

    const register = fs.readFileSync(path.join(MOBILE, "src/screens/RegisterScreen.tsx"), "utf8");
    expect(register).toContain("useAuth");
    expect(register).toContain("register(");

    const nav = fs.readFileSync(path.join(MOBILE, "src/navigation/AppNavigator.tsx"), "utf8");
    expect(nav).toContain("'/privacy'");
    expect(nav).toContain("'/terms'");
    expect(nav).toContain("RegisterScreen");
    expect(nav).toContain("MyListingsScreen");
  });

  it("targets Android API 35 via expo-build-properties (Google Play requirement)", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    const plugins = app.plugins as unknown[];
    const buildProps = plugins.find(
      (p) => Array.isArray(p) && p[0] === "expo-build-properties"
    ) as [string, { android: Record<string, number | string> }] | undefined;
    expect(buildProps).toBeDefined();
    expect(buildProps![1].android.targetSdkVersion).toBe(35);
    expect(buildProps![1].android.compileSdkVersion).toBe(35);
  });

  it("declares listing custom-scheme intentFilter without inventing assetlinks", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    const android = app.android as Record<string, unknown>;
    const filters = android.intentFilters as Array<Record<string, unknown>>;
    expect(Array.isArray(filters)).toBe(true);
    expect(filters.some((f) => f.autoVerify === false)).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public/.well-known/assetlinks.json"))).toBe(false);
  });

  it("does not ship a fake assetlinks.json without signing fingerprints", () => {
    expect(fs.existsSync(path.join(ROOT, "public/.well-known/assetlinks.json"))).toBe(false);
  });
});
