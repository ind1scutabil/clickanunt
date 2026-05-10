/** Curăță JWT din header/cookie/localStorage (Bearer duplicat, ghilimele, spații). Safe pe client. */
export function normalizeJwtInput(token: string): string {
  let t = (token || "").trim();
  if (!t || t === "null" || t === "undefined") return "";
  while (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  if (t.length >= 2) {
    const q = t[0];
    if ((q === "\"" && t.endsWith("\"")) || (q === "'" && t.endsWith("'"))) {
      t = t.slice(1, -1).trim();
    }
  }
  return t;
}
