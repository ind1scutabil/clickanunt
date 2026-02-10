/**
 * Scam Detection System - Automatic fraud prevention
 * Analyzes listings and messages for suspicious patterns
 */

import crypto from "crypto";

// Scam detection result
export interface ScamDetectionResult {
  isScam: boolean;
  confidence: number; // 0-1
  flags: ScamFlag[];
  score: number; // 0-100 (higher = more suspicious)
}

export interface ScamFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence?: any;
}

// Suspicious keywords patterns
const SUSPICIOUS_KEYWORDS = [
  // Payment scams
  /\bwestern\s*union\b/i,
  /\bmoneygram\b/i,
  /\bgift\s*card/i,
  /\bitunes\s*card/i,
  /\bbitcoin\s*only\b/i,
  /\bcrypto\s*only\b/i,
  /\bwire\s*transfer\b/i,
  /\badvance\s*payment\b/i,
  /\bdeposit\s*first\b/i,
  
  // Urgency tactics
  /\burgent\s*sale\b/i,
  /\bmust\s*sell\s*today\b/i,
  /\bact\s*fast\b/i,
  /\blimited\s*time\b/i,
  /\bfirst\s*come/i,
  
  // Too good to be true
  /\b50%\s*off\b/i,
  /\b90%\s*off\b/i,
  /\bfree\s*iphone\b/i,
  /\bfree\s*car\b/i,
  /\bno\s*payment\s*needed\b/i,
  
  // External contact
  /\bwhatsapp\s*me\b/i,
  /\btelegram\s*me\b/i,
  /\bsignal\s*app\b/i,
  /\bemail\s*me\s*directly\b/i,
  /\bcontact\s*outside\b/i,
  
  // Nigerian prince style
  /\binheritance\b/i,
  /\bmillion\s*dollars\b/i,
  /\btransfer\s*funds\b/i,
  /\bhelp\s*me\s*transfer\b/i,
];

// Suspicious URL patterns
const SUSPICIOUS_URLS = [
  /bit\.ly/i,
  /tinyurl/i,
  /goo\.gl/i,
  /t\.co/i,
  /\.(tk|ml|ga|cf|gq)$/i, // Free domains
];

// Detect duplicate content (simple hash-based)
export function generateContentHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("md5").update(normalized).digest("hex");
}

// Detect abnormal pricing
export function detectAbnormalPrice(
  priceAmount: number,
  category: string,
  title: string
): ScamFlag | null {
  // Category-based price ranges (in RON)
  const priceRanges: Record<string, { min: number; max: number; typical: number }> = {
    "Auto, moto și ambarcațiuni": { min: 1000, max: 500000, typical: 25000 },
    "Imobiliare": { min: 10000, max: 10000000, typical: 100000 },
    "Electronice și electrocasnice": { min: 50, max: 50000, typical: 2000 },
    "Modă și frumusețe": { min: 10, max: 5000, typical: 200 },
    "Casă și grădină": { min: 20, max: 20000, typical: 500 },
  };

  const range = priceRanges[category];
  if (!range) return null;

  // Price is suspiciously low (< 10% of typical)
  if (priceAmount < range.typical * 0.1 && priceAmount > 0) {
    return {
      type: "abnormal_price_low",
      severity: "high",
      description: "Preț suspiciously low compared to typical market value",
      evidence: { price: priceAmount, typical: range.typical, ratio: priceAmount / range.typical }
    };
  }

  // Price is extremely high (> 5x typical) for common items
  const commonItems = /iphone|samsung|laptop|televizor/i;
  if (commonItems.test(title) && priceAmount > range.typical * 5) {
    return {
      type: "abnormal_price_high",
      severity: "medium",
      description: "Preț unusually high for common item",
      evidence: { price: priceAmount, typical: range.typical }
    };
  }

  // Round suspicious prices (e.g., 1 RON, 10 RON for expensive items)
  if ((priceAmount === 1 || priceAmount === 10) && range.typical > 1000) {
    return {
      type: "placeholder_price",
      severity: "medium",
      description: "Suspicious placeholder price",
      evidence: { price: priceAmount }
    };
  }

  return null;
}

// Detect suspicious text patterns
export function detectSuspiciousText(text: string): ScamFlag[] {
  const flags: ScamFlag[] = [];

  // Check for suspicious keywords
  for (const pattern of SUSPICIOUS_KEYWORDS) {
    if (pattern.test(text)) {
      flags.push({
        type: "suspicious_keyword",
        severity: "medium",
        description: `Suspicious keyword detected: ${pattern.source}`,
        evidence: { pattern: pattern.source }
      });
    }
  }

  // Check for suspicious URLs
  for (const pattern of SUSPICIOUS_URLS) {
    if (pattern.test(text)) {
      flags.push({
        type: "suspicious_url",
        severity: "high",
        description: "Shortened or suspicious URL detected",
        evidence: { pattern: pattern.source }
      });
    }
  }

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    flags.push({
      type: "excessive_caps",
      severity: "low",
      description: "Excessive use of capital letters",
      evidence: { capsRatio }
    });
  }

  // Check for excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    flags.push({
      type: "excessive_punctuation",
      severity: "low",
      description: "Excessive use of exclamation marks",
      evidence: { count: exclamationCount }
    });
  }

  // Check for phone numbers in text (should use dedicated field)
  const phonePattern = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = text.match(phonePattern);
  if (phoneMatches && phoneMatches.length > 0) {
    flags.push({
      type: "embedded_contact",
      severity: "low",
      description: "Phone number embedded in description",
      evidence: { matches: phoneMatches }
    });
  }

  // Check for email addresses in text
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailPattern);
  if (emailMatches && emailMatches.length > 0) {
    flags.push({
      type: "embedded_contact",
      severity: "low",
      description: "Email address embedded in description",
      evidence: { matches: emailMatches }
    });
  }

  return flags;
}

// Detect bot-like behavior
export function detectBotBehavior(
  listingsCount: number,
  timeSpan: number, // minutes
  similarity: number // 0-1 (how similar the listings are)
): ScamFlag | null {
  // Too many listings in short time
  if (listingsCount > 10 && timeSpan < 60) {
    return {
      type: "rapid_posting",
      severity: "high",
      description: "Unusually rapid listing creation",
      evidence: { count: listingsCount, timeSpan, rate: listingsCount / timeSpan }
    };
  }

  // High similarity between listings (copy-paste)
  if (similarity > 0.9 && listingsCount > 3) {
    return {
      type: "duplicate_content",
      severity: "high",
      description: "Multiple listings with near-identical content",
      evidence: { similarity, count: listingsCount }
    };
  }

  return null;
}

// Main scam detection function for listings
export function detectScam(listing: {
  title: string;
  description: string;
  priceAmount: number;
  category: string;
  photos: string[];
}): ScamDetectionResult {
  const flags: ScamFlag[] = [];

  // Check title
  flags.push(...detectSuspiciousText(listing.title));

  // Check description
  flags.push(...detectSuspiciousText(listing.description));

  // Check price
  const priceFlag = detectAbnormalPrice(
    listing.priceAmount,
    listing.category,
    listing.title
  );
  if (priceFlag) flags.push(priceFlag);

  // Check for missing photos
  if (listing.photos.length === 0) {
    flags.push({
      type: "no_photos",
      severity: "medium",
      description: "No photos provided",
      evidence: { photoCount: 0 }
    });
  }

  // Check for stock photos (placeholder detection)
  const stockPhotoPatterns = [/placeholder/i, /stock-photo/i, /shutterstock/i];
  for (const photo of listing.photos) {
    for (const pattern of stockPhotoPatterns) {
      if (pattern.test(photo)) {
        flags.push({
          type: "stock_photo",
          severity: "medium",
          description: "Possible stock/placeholder photo",
          evidence: { url: photo }
        });
      }
    }
  }

  // Calculate overall scam score
  const severityWeights = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50
  };

  const score = flags.reduce((sum, flag) => sum + severityWeights[flag.severity], 0);
  const confidence = Math.min(score / 100, 1);

  return {
    isScam: score >= 50, // Threshold for automatic flagging
    confidence,
    flags,
    score: Math.min(score, 100)
  };
}

// Detect suspicious messages in chat
export function detectSuspiciousMessage(message: string): {
  isSuspicious: boolean;
  warning?: string;
  flags: ScamFlag[];
} {
  const flags = detectSuspiciousText(message);
  
  // Critical keywords that should trigger warning
  const criticalPatterns = [
    /western\s*union/i,
    /gift\s*card/i,
    /wire\s*transfer/i,
    /bitcoin\s*only/i,
    /deposit\s*first/i,
  ];

  const hasCritical = criticalPatterns.some(p => p.test(message));

  if (hasCritical || flags.some(f => f.severity === "high" || f.severity === "critical")) {
    return {
      isSuspicious: true,
      warning: "⚠️ Mesajul conține termeni suspecți. Fii atent la înșelătorii!",
      flags
    };
  }

  if (flags.length > 0) {
    return {
      isSuspicious: true,
      warning: "💡 Verifică identitatea vânzătorului înainte de a trimite bani.",
      flags
    };
  }

  return {
    isSuspicious: false,
    flags: []
  };
}

// Calculate text similarity (Jaccard index)
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
