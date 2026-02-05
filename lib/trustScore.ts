/**
 * Trust Score Calculation System
 * Dynamic trust score based on user behavior
 */

import { prisma } from './prisma';
import { auditActions } from './audit';
import type { TokenPayload } from './auth';

export interface TrustScoreFactors {
  listingsCreated: number;
  listingsApproved: number;
  listingsRejected: number;
  reportsReceived: number;
  accountAge: number; // days
  verificationLevel: number; // 0-3
  banHistory: number;
}

export interface TrustScoreConfig {
  weights: {
    listingsApproved: number;
    listingsRejected: number;
    reportsReceived: number;
    accountAge: number;
    verificationLevel: number;
    banHistory: number;
  };
  thresholds: {
    autoApprove: number; // >= acest score, auto-approve listings
    manualReview: number; // < acest score, manual review
    restricted: number;   // < acest score, restricted actions
  };
}

// Default config (poate fi overridden din Settings)
const DEFAULT_CONFIG: TrustScoreConfig = {
  weights: {
    listingsApproved: 2,
    listingsRejected: -5,
    reportsReceived: -3,
    accountAge: 0.1, // 0.1 per zi
    verificationLevel: 10, // per nivel
    banHistory: -20, // per ban
  },
  thresholds: {
    autoApprove: 80,
    manualReview: 60,
    restricted: 30,
  },
};

/**
 * Calculează trust score pentru un user
 */
export async function calculateTrustScore(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      listings: {
        select: {
          moderationStatus: true,
        },
      },
      reports: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const factors: TrustScoreFactors = {
    listingsCreated: user.listings.length,
    listingsApproved: user.listings.filter((l: any) => l.moderationStatus === 'approved').length,
    listingsRejected: user.listings.filter((l: any) => l.moderationStatus === 'rejected').length,
    reportsReceived: user.reports.filter((r: any) => r.status === 'resolved').length,
    accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    verificationLevel: user.twoFactorEnabled ? 2 : 0,
    banHistory: user.isBanned ? 1 : 0,
  };

  const config = DEFAULT_CONFIG; // TODO: Load from Settings

  let score = 50; // Base score

  // Apply weights
  score += factors.listingsApproved * config.weights.listingsApproved;
  score += factors.listingsRejected * config.weights.listingsRejected;
  score += factors.reportsReceived * config.weights.reportsReceived;
  score += factors.accountAge * config.weights.accountAge;
  score += factors.verificationLevel * config.weights.verificationLevel;
  score += factors.banHistory * config.weights.banHistory;

  // Clamp between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return score;
}

/**
 * Update trust score pentru un user
 */
export async function updateTrustScore(userId: string, actor?: TokenPayload): Promise<number> {
  const newScore = await calculateTrustScore(userId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { trustScore: newScore },
  });

  // Audit log
  if (actor) {
    await auditActions.userUpdated(
      actor,
      userId,
      { trustScore: user.trustScore },
      { trustScore: newScore }
    );
  }

  return newScore;
}

/**
 * Verifică dacă user poate auto-approve listings
 */
export async function canAutoApprove(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true },
  });

  return (user?.trustScore ?? 0) >= DEFAULT_CONFIG.thresholds.autoApprove;
}

/**
 * Verifică dacă listing necesită manual review
 */
export async function requiresManualReview(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true },
  });

  return (user?.trustScore ?? 0) < DEFAULT_CONFIG.thresholds.manualReview;
}

/**
 * Verifică dacă user are acțiuni restricted
 */
export async function isRestricted(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true, isBanned: true },
  });

  if (user?.isBanned) return true;
  return (user?.trustScore ?? 0) < DEFAULT_CONFIG.thresholds.restricted;
}

/**
 * Batch update trust scores (pentru cron job)
 */
export async function batchUpdateTrustScores(limit = 100): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
    },
    select: { id: true },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  let updated = 0;
  for (const user of users) {
    try {
      await updateTrustScore(user.id);
      updated++;
    } catch (error) {
      console.error(`Failed to update trust score for user ${user.id}:`, error);
    }
  }

  return updated;
}
