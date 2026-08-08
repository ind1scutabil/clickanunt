/**
 * @jest-environment node
 *
 * Listing photos are served from /api/uploads/serve and are referenced by page HTML,
 * og:image, JSON-LD and sitemap-images. A blanket `Disallow: /api/` made every one of
 * them uncrawlable, so these tests pin both halves of the rule: media is crawlable and
 * the rest of /api/ stays blocked.
 */

import robots from "@/app/robots";

type Rule = {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

const toArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

function ruleGroups(): Rule[] {
  const { rules } = robots();
  return (Array.isArray(rules) ? rules : [rules]) as Rule[];
}

function groupFor(userAgent: string): Rule {
  const match = ruleGroups().find((r) => toArray(r.userAgent).includes(userAgent));
  if (!match) {
    throw new Error(`no robots group for ${userAgent}`);
  }
  return match;
}

/**
 * Longest-match evaluation, as used by Google and Bing: the most specific matching
 * rule wins, and Allow wins ties.
 */
function isAllowed(path: string, userAgent: string): boolean {
  const group = groupFor(userAgent);
  const longest = (patterns: string[]) =>
    patterns.filter((p) => path.startsWith(p)).reduce((max, p) => Math.max(max, p.length), -1);

  const allowLen = longest(toArray(group.allow));
  const disallowLen = longest(toArray(group.disallow));
  if (disallowLen === -1) return true;
  return allowLen >= disallowLen;
}

const CRAWLERS = ["*", "Googlebot", "Googlebot-Image"];
/** Bingbot has no dedicated group — longest-match rules from `*` apply. */
const IMAGE_PATH = "/api/uploads/serve?key=listings%2Fabc%2Foriginal%2Fphoto.jpg";

function isAllowedForCrawler(path: string, userAgent: string): boolean {
  if (userAgent === "Bingbot") return isAllowed(path, "*");
  return isAllowed(path, userAgent);
}

describe("robots.txt public media access", () => {
  it.each([...CRAWLERS, "Bingbot"])("allows listing images for %s", (ua) => {
    expect(isAllowedForCrawler(IMAGE_PATH, ua)).toBe(true);
  });

  it.each([...CRAWLERS, "Bingbot"])("still blocks every other /api/ route for %s", (ua) => {
    expect(isAllowedForCrawler("/api/listings", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/listings/abc", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/admin/moderation", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/auth", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/auth/login", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/admin", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/csrf", ua)).toBe(false);
    expect(isAllowedForCrawler("/api/uploads", ua)).toBe(false);
  });

  it.each(CRAWLERS)("keeps public HTML crawlable for %s", (ua) => {
    expect(isAllowed("/listings/abc", ua)).toBe(true);
    expect(isAllowed("/auto/skoda/octavia", ua)).toBe(true);
    expect(isAllowed("/", ua)).toBe(true);
  });

  it("declares an explicit Googlebot-Image group", () => {
    const agents = ruleGroups().flatMap((r) => toArray(r.userAgent));
    expect(agents).toEqual(expect.arrayContaining(["*", "Googlebot", "Googlebot-Image"]));
  });

  it("does not open /api/ wholesale", () => {
    for (const rule of ruleGroups()) {
      expect(toArray(rule.allow)).not.toContain("/api/");
      expect(toArray(rule.allow)).not.toContain("/api");
      expect(toArray(rule.disallow)).toContain("/api/");
    }
  });
});
