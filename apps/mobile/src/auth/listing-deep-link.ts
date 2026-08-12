/**
 * Deep-link helpers for listing detail (custom scheme + https /listings/:id).
 * Website App Links claim only https://www.clickanunt.ro/listings/* (see app.json).
 */
export function extractListingIdFromDeepLink(url: string): string | null {
  try {
    const trimmed = url.trim();
    // Expo Go / Metro: exp://host/--/listings/:id
    const expMatch = trimmed.match(/\/--\/listings\/([A-Za-z0-9_-]{8,128})(?:\/|\?|$)/i);
    if (expMatch?.[1]) return expMatch[1];

    const normalized = trimmed
      .replace(/^clickanunt:\/\//i, 'https://app.clickanunt.local/')
      .replace(/^clickanunt:/i, 'https://app.clickanunt.local/');
    const u = new URL(normalized);
    const path = u.pathname || '';
    // /listings/:id or listings/:id
    const m = path.match(/\/listings\/([A-Za-z0-9_-]{8,128})(?:\/|$)/i);
    if (m?.[1]) return m[1];
    // clickanunt://listings/:id → host=listings, path=/:id
    if ((u.hostname || '').toLowerCase() === 'listings') {
      const id = path.replace(/^\//, '').split('/')[0];
      if (id && /^[A-Za-z0-9_-]{8,128}$/.test(id)) return id;
    }
  } catch {
    return null;
  }
  return null;
}
