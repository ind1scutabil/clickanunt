/** @jest-environment node */
/**
 * Locks Android/Expo Play-readiness facts that must stay 1:1 with the live site brand.
 * Does not invent FCM or store screenshots. App Links fingerprints must match Play Console.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOBILE = path.join(ROOT, "apps/mobile");

/** Play App Signing SHA-256 from Play Console (not upload key). */
const PLAY_APP_SIGNING_FINGERPRINTS = [
  "B4:F5:EA:F7:B6:24:FE:C0:BC:E6:1C:A8:C9:8C:00:66:B0:2E:7A:5E:EB:23:35:02:9E:22:E0:12:50:8B:35:87",
  "F5:5A:93:FC:A9:C0:53:BF:EC:0C:E2:D3:BF:1E:4A:83:2E:13:B4:5E:DE:41:8B:07:3F:A6:2F:EF:2D:61:3C:78",
  "CD:B3:DC:6C:22:FF:C7:2F:0C:79:07:92:8F:53:00:CD:A3:6C:50:82:98:61:18:C2:39:00:70:00:ED:AE:A1:A6",
] as const;

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
    expect(android.versionCode).toBe(4);
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

  it("enables HTTPS App Links for www listings path and keeps custom scheme", () => {
    const app = readJson("app.json").expo as Record<string, unknown>;
    const android = app.android as Record<string, unknown>;
    const filters = android.intentFilters as Array<Record<string, unknown>>;
    expect(Array.isArray(filters)).toBe(true);

    const httpsFilter = filters.find((f) => {
      const data = f.data as Array<Record<string, string>> | undefined;
      return data?.some((d) => d.scheme === "https" && d.host === "www.clickanunt.ro");
    });
    expect(httpsFilter).toBeDefined();
    expect(httpsFilter!.autoVerify).toBe(true);
    const httpsData = (httpsFilter!.data as Array<Record<string, string>>)[0];
    expect(httpsData.pathPrefix).toBe("/listings");

    // Apex must not be autoVerify-declared (301 to www is insufficient for DAL).
    for (const f of filters) {
      const data = (f.data as Array<Record<string, string>> | undefined) ?? [];
      expect(data.some((d) => d.host === "clickanunt.ro")).toBe(false);
    }

    const custom = filters.find((f) => {
      const data = f.data as Array<Record<string, string>> | undefined;
      return data?.some((d) => d.scheme === "clickanunt" && d.host === "listings");
    });
    expect(custom).toBeDefined();
  });
});

describe("Digital Asset Links (assetlinks.json)", () => {
  const assetlinksPath = path.join(ROOT, "public/.well-known/assetlinks.json");

  it("publishes package, relation, and Play App Signing fingerprints only", () => {
    expect(fs.existsSync(assetlinksPath)).toBe(true);
    const statements = JSON.parse(fs.readFileSync(assetlinksPath, "utf8")) as Array<{
      relation: string[];
      target: {
        namespace: string;
        package_name: string;
        sha256_cert_fingerprints: string[];
      };
    }>;
    expect(statements).toHaveLength(1);
    const stmt = statements[0];
    expect(stmt.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(stmt.target.namespace).toBe("android_app");
    expect(stmt.target.package_name).toBe("ro.clickanunt.mobile");
    expect(stmt.target.sha256_cert_fingerprints).toEqual([...PLAY_APP_SIGNING_FINGERPRINTS]);
    // No comments / extra keys
    expect(Object.keys(stmt).sort()).toEqual(["relation", "target"]);
    expect(Object.keys(stmt.target).sort()).toEqual([
      "namespace",
      "package_name",
      "sha256_cert_fingerprints",
    ]);
  });
});
