/**
 * Originea publică pentru linkuri în emailuri (reset parolă, etc.).
 * În producție folosește aceeași logică ca `@/lib/site-url` (canonical www, fără host nesigur).
 */
import { siteOrigin } from '@/lib/site-url';

export function publicSiteOrigin(): string {
  if (process.env.NODE_ENV === 'production') {
    return siteOrigin();
  }

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'http://localhost:3000';

  return raw.replace(/\/+$/, '');
}
