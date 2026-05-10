/** Fold Romanian diacritics for URL-safe ASCII slugs. */
function foldRomanian(s: string): string {
  return s
    .replace(/ă/gi, 'a')
    .replace(/â/gi, 'a')
    .replace(/î/gi, 'i')
    .replace(/ș/gi, 's')
    .replace(/ş/gi, 's')
    .replace(/ț/gi, 't')
    .replace(/ţ/gi, 't');
}

/** SEO slug (lowercase, hyphenated, diacritic-free). */
export function slugifyRo(input: string): string {
  const folded = foldRomanian(input.trim())
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
  return folded
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
