import type { Page } from "@playwright/test";

/** Persist cookie consent so the banner cannot intercept clicks during E2E. */
export async function seedCookieConsentAccepted(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "clickanunt_cookie_consent_v1",
        JSON.stringify({
          v: 1,
          necessary: true,
          analytics: false,
          marketing: false,
          decidedAt: new Date().toISOString(),
        })
      );
    } catch {
      /* ignore */
    }
  });
}

export async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const cookie = page.getByRole("dialog", { name: /Consimțământ cookie/i });
  if (await cookie.isVisible().catch(() => false)) {
    await cookie.getByRole("button", { name: /Acceptă|Refuză/i }).first().click();
  }
}
