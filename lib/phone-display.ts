/** Link tel: pentru apelare (normalizare spații) */
export function phoneToTelHref(phone: string): string {
  const t = phone.trim();
  if (!t) return '';
  if (t.startsWith('+')) return '+' + t.slice(1).replace(/\D/g, '');
  return t.replace(/\D/g, '');
}

/** Afișare lizibilă (păstrează formatarea userului) */
export function formatPhoneDisplay(phone: string): string {
  return phone.trim() || '';
}
