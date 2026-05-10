/**
 * Originea publică pentru linkuri în emailuri (reset parolă, etc.).
 * Preferă variabilele Next; fallback la domeniul producție.
 */
export function publicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://clickanunt.ro';
  return raw.replace(/\/+$/, '');
}
