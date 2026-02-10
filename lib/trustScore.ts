/**
 * Trust Score System - Dynamic user reputation management
 * Scores range from 0-100, affecting moderation and rate limits
 */

import { prisma } from "./prisma";
import { createAuditLog } from "./audit";

// Trust levels with thresholds
export const TRUST_LEVELS = {
  VERIFIED: 90,      // Instant publishing, no limits
  TRUSTED: 70,       // Fast-track moderation
  NEUTRAL: 50,       // Standard moderation
  SUSPICIOUS: 30,    // Slow moderation, limited actions
  BANNED: 0          // No publishing
} as const;

// Trust status labels
export function getTrustStatus(score: number): string {
  if (score >= TRUST_LEVELS.VERIFIED) return "Verificat";
  if (score >= TRUST_LEVELS.TRUSTED) return "De încredere";
  if (score >= TRUST_LEVELS.NEUTRAL) return "Standard";
  if (score >= TRUST_LEVELS.SUSPICIOUS) return "Limitat";
  return "Suspendat";
}

// Trust badge color
export function getTrustBadgeColor(score: number): string {
  if (score >= TRUST_LEVELS.VERIFIED) return "#39FF14"; // Green
  if (score >= TRUST_LEVELS.TRUSTED) return "#1E90FF";  // Blue
  if (score >= TRUST_LEVELS.NEUTRAL) return "#FFB84D";  // Orange
  if (score >= TRUST_LEVELS.SUSPICIOUS) return "#FF6B6B"; // Red
  return "#666666"; // Gray
}

// Calculate trust score based on user behavior
export interface TrustFactors {
  emailVerified: boolean;
  phoneVerified: boolean;
  accountAge: number; // days
  completedListings: number;
  activeListings: number;
  receivedReports: number;
  resolvedReports: number;
  avgResponseTime?: number; // hours
  successfulTransactions: number;
  failedVerifications: number;
  suspiciousActivity: number;
  positiveReviews: number;
  negativeReviews: number;
}

export function calculateTrustScore(factors: TrustFactors): number {
  let score = 50; // Start neutral

  // Email verification (mandatory baseline)
  if (!factors.emailVerified) {
    return Math.max(score - 30, 10); // Heavy penalty
  }

  // Phone verification bonus
  if (factors.phoneVerified) {
    score += 15;
  }

  // Account age bonus (up to 10 points)
  const ageDays = factors.accountAge;
  if (ageDays > 365) score += 10;
  else if (ageDays > 180) score += 7;
  else if (ageDays > 90) score += 5;
  else if (ageDays > 30) score += 3;
  else if (ageDays > 7) score += 1;

  // Activity bonuses
  score += Math.min(factors.completedListings * 2, 15); // Up to 15 points
  score += Math.min(factors.successfulTransactions * 3, 15); // Up to 15 points

  // Review scores
  const totalReviews = factors.positiveReviews + factors.negativeReviews;
  if (totalReviews > 0) {
    const positiveRatio = factors.positiveReviews / totalReviews;
    score += positiveRatio * 10; // Up to 10 points
  }

  // Penalties
  score -= factors.receivedReports * 5;
  score -= factors.suspiciousActivity * 10;
  score -= factors.failedVerifications * 8;
  score -= factors.negativeReviews * 3;

  // Active listings balance
  if (factors.activeListings > 10) {
    score += 5; // Power seller bonus
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Update user trust score
export async function updateUserTrustScore(
  userId: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      listings: {
        where: {
          status: { in: ["active", "sold"] }
        }
      }
    }
  });

  if (!user) throw new Error("User not found");

  // Calculate account age
  const accountAge = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count listings
  const completedListings = user.listings.filter((l: any) => l.status === "sold").length;
  const activeListings = user.listings.filter((l: any) => l.status === "active").length;

  // TODO: Fetch from reports/reviews tables when implemented
  const factors: TrustFactors = {
    emailVerified: true, // We require email for registration
    phoneVerified: false, // TODO: Implement phone verification
    accountAge,
    completedListings,
    activeListings,
    receivedReports: 0,
    resolvedReports: 0,
    successfulTransactions: completedListings,
    failedVerifications: user.failedLoginAttempts || 0,
    suspiciousActivity: 0,
    positiveReviews: 0,
    negativeReviews: 0
  };

  const newScore = calculateTrustScore(factors);
  const oldScore = user.trustScore;

  // Update score in database
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: newScore }
  });

  // Audit log
  await createAuditLog({
    userId,
    action: "trust_score_updated",
    resource: "user",
    resourceId: userId,
    details: {
      email: user.email,
      role: user.role,
      before: { trustScore: oldScore },
      after: { trustScore: newScore },
      reason,
      factors,
      ...metadata
    }
  });

  return newScore;
}

// Check if user can perform action based on trust score
export function canPerformAction(
  trustScore: number,
  action: "publish" | "message" | "report" | "promote"
): boolean {
  switch (action) {
    case "publish":
      return trustScore >= TRUST_LEVELS.SUSPICIOUS;
    case "message":
      return trustScore >= TRUST_LEVELS.SUSPICIOUS;
    case "report":
      return trustScore >= TRUST_LEVELS.NEUTRAL;
    case "promote":
      return trustScore >= TRUST_LEVELS.TRUSTED;
    default:
      return false;
  }
}

// Get rate limit based on trust score
export function getRateLimit(trustScore: number): {
  listingsPerDay: number;
  messagesPerHour: number;
  reportsPerDay: number;
  moderationBypass: boolean;
} {
  if (trustScore >= TRUST_LEVELS.VERIFIED) {
    return {
      listingsPerDay: 50,
      messagesPerHour: 100,
      reportsPerDay: 20,
      moderationBypass: true // Instant publishing
    };
  }
  
  if (trustScore >= TRUST_LEVELS.TRUSTED) {
    return {
      listingsPerDay: 20,
      messagesPerHour: 50,
      reportsPerDay: 10,
      moderationBypass: false
    };
  }
  
  if (trustScore >= TRUST_LEVELS.NEUTRAL) {
    return {
      listingsPerDay: 10,
      messagesPerHour: 20,
      reportsPerDay: 5,
      moderationBypass: false
    };
  }
  
  if (trustScore >= TRUST_LEVELS.SUSPICIOUS) {
    return {
      listingsPerDay: 3,
      messagesPerHour: 10,
      reportsPerDay: 2,
      moderationBypass: false
    };
  }
  
  // Banned
  return {
    listingsPerDay: 0,
    messagesPerHour: 0,
    reportsPerDay: 0,
    moderationBypass: false
  };
}

// Award trust points for good behavior
export async function awardTrustPoints(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true, email: true, role: true }
  });

  if (!user) return;

  const newScore = Math.min(100, user.trustScore + points);

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: newScore }
  });

  await createAuditLog({
    userId,
    action: "trust_points_awarded",
    resource: "user",
    resourceId: userId,
    details: {
      email: user.email,
      role: user.role,
      before: { trustScore: user.trustScore },
      after: { trustScore: newScore },
      points,
      reason
    }
  });
}

// Deduct trust points for bad behavior
export async function deductTrustPoints(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true, email: true, role: true }
  });

  if (!user) return;

  const newScore = Math.max(0, user.trustScore - points);

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: newScore }
  });

  await createAuditLog({
    userId,
    action: "trust_points_deducted",
    resource: "user",
    resourceId: userId,
    details: {
      email: user.email,
      role: user.role,
      before: { trustScore: user.trustScore },
      after: { trustScore: newScore },
      points,
      reason
    }
  });
}
