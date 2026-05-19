/** @jest-environment node */
import {
  buildWwwRedirectUrl,
  shouldRedirectApexToWww,
} from "@/lib/seo/apex-canonical-host";

describe("apex canonical host", () => {
  it("redirects bare clickanunt.ro", () => {
    expect(shouldRedirectApexToWww("clickanunt.ro")).toBe(true);
    expect(shouldRedirectApexToWww("clickanunt.ro:443")).toBe(true);
  });

  it("does not redirect www or localhost", () => {
    expect(shouldRedirectApexToWww("www.clickanunt.ro")).toBe(false);
    expect(shouldRedirectApexToWww("localhost")).toBe(false);
    expect(shouldRedirectApexToWww("127.0.0.1")).toBe(false);
  });

  it("preserves path and query on redirect target", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.clickanunt.ro";
    const src = new URL("https://clickanunt.ro/listings?page=2&q=bmw");
    const target = buildWwwRedirectUrl(src, true);
    expect(target.hostname).toBe("www.clickanunt.ro");
    expect(target.pathname).toBe("/listings");
    expect(target.search).toBe("?page=2&q=bmw");
    expect(target.protocol).toBe("https:");
    expect(target.port).toBe("");
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
});
