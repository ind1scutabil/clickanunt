/**
 * Serialize moderation flag objects for notes / queue without `[object Object]`.
 * User-facing messages must stay separate from internal reasons.
 */

export type ModerationFlagLike = {
  type?: unknown;
  reason?: unknown;
  categories?: unknown;
  keywords?: unknown;
  types?: unknown;
  details?: unknown;
  [key: string]: unknown;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

/** Safe one-line summary for admin notes / queue (not antifraud internals dump). */
export function formatModerationFlagSummary(flag: unknown): string {
  if (flag == null) return "unknown";
  if (typeof flag === "string") return flag.trim() || "unknown";
  if (typeof flag !== "object") return String(flag);

  const f = flag as ModerationFlagLike;
  const type =
    typeof f.type === "string" && f.type.trim() ? f.type.trim() : "flag";

  if (typeof f.reason === "string" && f.reason.trim()) {
    return `${type}: ${f.reason.trim()}`;
  }

  const categories = asStringList(f.categories);
  if (categories.length) return `${type}: ${categories.join("|")}`;

  const keywords = asStringList(f.keywords);
  if (keywords.length) return `${type}: ${keywords.slice(0, 8).join("|")}`;

  const types = asStringList(f.types);
  if (types.length) return `${type}: ${types.join("|")}`;

  return type;
}

export function formatModerationFlagsForNotes(flags: unknown[]): string | null {
  if (!Array.isArray(flags) || flags.length === 0) return null;
  const parts = flags.map(formatModerationFlagSummary).filter(Boolean);
  if (!parts.length) return null;
  return `Flags: ${parts.join("; ")}`;
}

/** Short user-safe message — never dump internal flag objects. */
export function userSafeModerationMessage(flags: unknown[]): string | null {
  if (!Array.isArray(flags) || flags.length === 0) return null;
  const hasCategory = flags.some(
    (f) =>
      f &&
      typeof f === "object" &&
      ((f as ModerationFlagLike).type === "category_moderation" ||
        (f as ModerationFlagLike).type === "subcategory_moderation")
  );
  if (hasCategory) {
    return "Anunțul necesită verificare manuală pentru categoria selectată.";
  }
  return "Anunțul a fost trimis spre moderare.";
}
