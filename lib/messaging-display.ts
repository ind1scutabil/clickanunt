const STAFF_ROLES = new Set<string>(['admin', 'owner', 'moderator', 'support', 'finance']);

export type MessagingUserLike = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

/**
 * Nume afișat în inbox / bule: personal intern → etichetă unică, nu numele din cont.
 */
export function displayNameForMessagingUser(user: MessagingUserLike | null | undefined): string {
  if (!user) return 'Utilizator';
  const r = user.role;
  if (r && STAFF_ROLES.has(r)) {
    return 'Echipa ClickAnunț';
  }
  const n = user.name?.trim();
  if (n) return n;
  const e = user.email?.trim();
  if (e) return e.split('@')[0] || 'Utilizator';
  return 'Utilizator';
}
