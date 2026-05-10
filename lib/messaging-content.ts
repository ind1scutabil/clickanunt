import DOMPurify from "isomorphic-dompurify";

/**
 * Normalizare conținut mesaj pentru stocare: trim + fără HTML (text simplu).
 */
export function normalizeMessagingContent(raw: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";

  const collapsed = s.replace(/\s+/g, " ");

  try {
    return String(DOMPurify.sanitize(collapsed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }));
  } catch {
    return collapsed;
  }
}
