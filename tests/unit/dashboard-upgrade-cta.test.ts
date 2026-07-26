/** @jest-environment node */
/**
 * Integrity: authenticated dashboard must not link to dead /dashboard/billing.
 * Business discovery CTA must point at /business.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("dashboard upgrade CTA integrity", () => {
  const dashboardSrc = read("app/dashboard/page.tsx");

  it("does not reference /dashboard/billing", () => {
    expect(dashboardSrc).not.toMatch(/\/dashboard\/billing/);
  });

  it("does not use UserRole premium for subscription UI", () => {
    expect(dashboardSrc).not.toMatch(/role\s*===\s*['"]premium['"]/);
    expect(dashboardSrc).not.toMatch(/role\s*!==\s*['"]premium['"]/);
  });

  it("links Business CTA to /business with truthful copy", () => {
    expect(dashboardSrc).toMatch(/href=["']\/business["']/);
    expect(dashboardSrc).toMatch(/Descoperă ClickAnunț Business/);
    expect(dashboardSrc).toMatch(
      /Soluții pentru dealeri și companii, stabilite în funcție de necesar/
    );
    expect(dashboardSrc).not.toMatch(/Upgrade la Premium/);
  });

  it("uses subscriptionTier helpers, not invented tiers", () => {
    expect(dashboardSrc).toMatch(/normalizeSubscriptionTier/);
    expect(dashboardSrc).toMatch(/shouldOfferBusinessDiscovery/);
    expect(dashboardSrc).toMatch(/subscriptionTierLabel/);
  });

  it("no active app route sources still link to /dashboard/billing", () => {
    const roots = ["app", "lib", "apps", "packages"];
    const offenders: string[] = [];
    for (const root of roots) {
      const abs = path.join(ROOT, root);
      if (!fs.existsSync(abs)) continue;
      const stack = [abs];
      while (stack.length) {
        const dir = stack.pop()!;
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          if (ent.name === "node_modules" || ent.name === ".next") continue;
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            stack.push(full);
            continue;
          }
          if (!/\.(tsx?|jsx?|mdx?)$/.test(ent.name)) continue;
          const text = fs.readFileSync(full, "utf8");
          if (text.includes("/dashboard/billing")) {
            offenders.push(path.relative(ROOT, full));
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SubscriptionCards remains unimported by app routes", () => {
    const appDir = path.join(ROOT, "app");
    const stack = [appDir];
    const imports: string[] = [];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
        if (ent.name === "SubscriptionCards.tsx") continue;
        const text = fs.readFileSync(full, "utf8");
        if (
          text.includes("SubscriptionCards") ||
          text.includes("components/SubscriptionCards")
        ) {
          imports.push(path.relative(ROOT, full));
        }
      }
    }
    expect(imports).toEqual([]);
  });
});
