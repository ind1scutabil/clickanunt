/**
 * Non-blocking trust / anti-spam signals for future moderation.
 * Does not reject listings — only computes a score and flags for dashboards or queues.
 */

export type ListingTrustInput = {
  title: string;
  description?: string | null;
  contactPhone?: string | null;
  imageCount?: number;
  /** Seller / account context when available */
  emailVerified?: boolean;
  userCreatedAt?: Date | null;
  activeListingCount?: number;
};

export type ListingTrustResult = {
  /** 0–100 heuristic; not a legal or financial guarantee */
  score: number;
  flags: string[];
};

const SUSPICIOUS_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "western_union", re: /\bwestern\s*union\b/i },
  { id: "moneygram", re: /\bmoneygram\b/i },
  { id: "paypal_friends", re: /\bpaypal\s*friends\b/i },
  { id: "trimite_bani", re: /\btrimite\s*bani\b/i },
  { id: "plata_avans", re: /\bplata\s*in\s*avans\b/i },
  { id: "too_good", re: /\b100%\s*sigur\b/i },
  { id: "no_verify", re: /\bnu\s*verific\b/i },
  { id: "whatsapp_only_en", re: /\bwhatsapp\s*only\b/i },
];

export function detectSuspiciousKeywords(text: string): string[] {
  const hits: string[] = [];
  const t = text.trim();
  if (!t) return hits;
  for (const { id, re } of SUSPICIOUS_PATTERNS) {
    if (re.test(t)) hits.push(id);
  }
  return hits;
}

/** Returns true if `title` already exists in the set (case-folded). */
export function isDuplicateTitleInBatch(title: string, titlesLowercased: Set<string>): boolean {
  const k = title.trim().toLowerCase();
  if (!k) return false;
  if (titlesLowercased.has(k)) return true;
  return false;
}

export function computeListingTrustScore(input: ListingTrustInput): ListingTrustResult {
  let score = 50;
  const flags: string[] = [];

  if (input.contactPhone?.trim()) {
    score += 8;
  } else {
    flags.push("no_phone");
    score -= 4;
  }

  if (input.emailVerified) {
    score += 10;
  } else {
    flags.push("email_unverified");
    score -= 2;
  }

  if (input.userCreatedAt) {
    const ageDays = (Date.now() - input.userCreatedAt.getTime()) / (86400 * 1000);
    if (ageDays >= 365) score += 8;
    else if (ageDays >= 30) score += 4;
    else {
      flags.push("new_account");
      score -= 4;
    }
  }

  const imgs = input.imageCount ?? 0;
  if (imgs >= 3) score += 10;
  else if (imgs === 1) score += 4;
  else {
    flags.push("few_images");
    score -= 3;
  }

  const active = input.activeListingCount ?? 0;
  if (active > 10) score += 4;
  if (active > 50) score += 2;

  const combined = `${input.title}\n${input.description ?? ""}`;
  const kw = detectSuspiciousKeywords(combined);
  if (kw.length > 0) {
    flags.push(`suspicious_keywords:${kw.length}`);
    score -= Math.min(20, kw.length * 6);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, flags };
}
