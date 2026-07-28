/**
 * Parse email-verification tokens from web or app deep-link URLs.
 * Does not log tokens.
 */
export function extractEmailVerificationToken(url: string): string | null {
  try {
    const normalized = url
      .trim()
      .replace(/^clickanunt:\/\//i, "https://app.clickanunt.local/")
      .replace(/^clickanunt:/i, "https://app.clickanunt.local/");
    const u = new URL(normalized);
    const token = u.searchParams.get("token");
    if (typeof token === "string" && token.length >= 32 && token.length <= 128) {
      if (/^[A-Za-z0-9_-]+$/.test(token)) return token;
    }
    const path = u.pathname || "";
    const m = path.match(/verify-email\/([A-Za-z0-9_-]{32,128})/);
    if (m?.[1]) return m[1];
  } catch {
    return null;
  }
  return null;
}

export function isEmailVerificationDeepLink(url: string): boolean {
  return extractEmailVerificationToken(url) !== null;
}
