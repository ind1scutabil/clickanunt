/**
 * Canonical public listings search URL builder (`q=` only — never `search=`).
 */
export function buildListingsSearchHref(
  query: string,
  opts?: { category?: string }
): string {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  const category = opts?.category?.trim();
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/listings?${qs}` : "/listings";
}
