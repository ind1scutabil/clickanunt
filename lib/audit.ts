/**
 * Audit Log System - IMUABIL
 * Tracking complet pentru owner control
 */

import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';
import { TokenPayload } from './auth';

// Actor type - can be TokenPayload or User object
type AuditActor = { id: string; email: string; role: string } | TokenPayload;

// Helper to extract userId from actor
function getActorId(actor: AuditActor): string {
  return 'userId' in actor ? getActorId(actor) : actor.id;
}

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  /** Merged into `details` as structured before/after for compliance review */
  before?: unknown;
  after?: unknown;
}

/**
 * Creează intrare în audit log (IMUABIL - nu poate fi ștearsă)
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const mergedDetails =
      entry.before !== undefined || entry.after !== undefined
        ? {
            ...(entry.details &&
            typeof entry.details === "object" &&
            entry.details !== null &&
            !Array.isArray(entry.details)
              ? (entry.details as Record<string, unknown>)
              : {}),
            ...(entry.before !== undefined ? { before: entry.before } : {}),
            ...(entry.after !== undefined ? { after: entry.after } : {}),
          }
        : entry.details;

    await prisma.auditLog.create({
      data: {
        userId: entry.userId || undefined,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || undefined,
        details: mergedDetails || undefined,
        ipAddress: entry.ipAddress || undefined,
        userAgent: entry.userAgent || undefined,
      },
    });
  } catch (error) {
    console.error('❌ Eroare scriere audit log:', error);
    // Nu aruncăm eroare ca să nu blocăm operațiunea principală
  }
}

/**
 * Helper pentru logare acțiuni utilizator
 */
export async function logUserAction(
  user: TokenPayload | null,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    userId: user?.userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Logare acțiuni specifice
 */
export const auditActions = {
  // User actions
  userLogin: (userId: string, email: string, ip?: string) =>
    createAuditLog({
      userId,
      action: 'user.login',
      resource: 'user',
      resourceId: userId,
      details: { email, ip },
    }),

  userLogout: (userId: string, email: string) =>
    createAuditLog({
      userId,
      action: 'user.logout',
      resource: 'user',
      resourceId: userId,
      details: { email },
    }),

  userCreated: (actor: AuditActor, newUser: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'user.create',
      resource: 'user',
      resourceId: newUser.id,
      details: { actor: { email: actor.email, role: actor.role }, user: newUser },
    }),

  userUpdated: (actor: AuditActor, userId: string, before: any, after: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'user.update',
      resource: 'user',
      resourceId: userId,
      details: { actor: { email: actor.email, role: actor.role }, before, after },
    }),

  userBanned: (actor: AuditActor, userId: string, reason: string, before: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'user.ban',
      resource: 'user',
      resourceId: userId,
      details: { actor: { email: actor.email, role: actor.role }, before, after: { isBanned: true, banReason: reason } },
    }),

  userUnbanned: (actor: AuditActor, userId: string, before: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'user.unban',
      resource: 'user',
      resourceId: userId,
      details: { actor: { email: actor.email, role: actor.role }, before, after: { isBanned: false } },
    }),

  userRoleChanged: (actor: AuditActor, user: any, oldRole: string, newRole: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'user.roleChange',
      resource: 'user',
      resourceId: user.id,
      details: { actor: { email: actor.email, role: actor.role }, targetUser: user.email, before: { role: oldRole }, after: { role: newRole } },
    }),

  // Listing actions
  listingCreated: (userId: string, listing: any) =>
    createAuditLog({
      userId,
      action: 'listing.create',
      resource: 'listing',
      resourceId: listing.id,
      details: { listing },
    }),

  listingUpdated: (userId: string, listingId: string, before: any, after: any) =>
    createAuditLog({
      userId,
      action: 'listing.update',
      resource: 'listing',
      resourceId: listingId,
      details: { before, after },
    }),

  listingDeleted: (actor: AuditActor, listingId: string, before: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'listing.delete',
      resource: 'listing',
      resourceId: listingId,
      details: { actor: { email: actor.email, role: actor.role }, before },
    }),

  listingApproved: (actor: AuditActor, listing: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'listing.approve',
      resource: 'listing',
      resourceId: listing.id,
      details: { actor: { email: actor.email, role: actor.role }, listing: { id: listing.id, title: listing.title }, after: { moderationStatus: 'approved' } },
    }),

  listingRejected: (actor: AuditActor, listing: any, reason: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'listing.reject',
      resource: 'listing',
      resourceId: listing.id,
      details: { actor: { email: actor.email, role: actor.role }, listing: { id: listing.id, title: listing.title }, after: { moderationStatus: 'rejected', reason } },
    }),

  listingFeatured: (actor: AuditActor, listingId: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'listing.feature',
      resource: 'listing',
      resourceId: listingId,
      details: { actor: { email: actor.email, role: actor.role }, after: { isFeatured: true } },
    }),

  // Report actions
  reportCreated: (userId: string, report: any) =>
    createAuditLog({
      userId,
      action: 'report.create',
      resource: 'report',
      resourceId: report.id,
      details: { report },
    }),

  reportResolved: (actor: AuditActor, report: any, resolution: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'report.resolve',
      resource: 'report',
      resourceId: report.id,
      details: { actor: { email: actor.email, role: actor.role }, after: { status: 'resolved', resolution } },
    }),

  // Appeal actions
  appealCreated: (userId: string, appeal: any) =>
    createAuditLog({
      userId,
      action: 'appeal.create',
      resource: 'appeal',
      resourceId: appeal.id,
      details: { appeal },
    }),

  appealReviewed: (actor: AuditActor, appealId: string, decision: string, response: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'appeal.review',
      resource: 'appeal',
      resourceId: appealId,
      details: { actor: { email: actor.email, role: actor.role }, after: { status: decision, response } },
    }),

  // Settings actions
  settingsUpdated: (actor: AuditActor, key: string, before: any, after: any) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'settings.update',
      resource: 'settings',
      resourceId: key,
      details: { actor: { email: actor.email, role: actor.role }, before, after },
    }),

  // Payment actions
  paymentCreated: (userId: string, payment: any) =>
    createAuditLog({
      userId,
      action: 'payment.create',
      resource: 'payment',
      resourceId: payment.id,
      details: { payment },
    }),

  paymentRefunded: (actor: AuditActor, paymentId: string, reason: string) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'payment.refund',
      resource: 'payment',
      resourceId: paymentId,
      details: { actor: { email: actor.email, role: actor.role }, reason },
    }),

  analyticsOrphanCleanup: (
    actor: AuditActor,
    orphanedBefore: {
      orphanListingRefs: number;
      orphanUserRefs: number;
      orphanSessionRefs: number;
    },
    deleted: {
      orphanListingRefs: number;
      orphanUserRefs: number;
      orphanSessionRefs: number;
    },
    remaining: {
      orphanListingRefs: number;
      orphanUserRefs: number;
      orphanSessionRefs: number;
    }
  ) =>
    createAuditLog({
      userId: getActorId(actor),
      action: 'analytics.orphan_cleanup',
      resource: 'analytics_events',
      details: {
        actor: { email: actor.email, role: actor.role },
        deletedEventRows: deleted,
      },
      before: orphanedBefore,
      after: remaining,
    }),
};

/**
 * Obține audit logs cu filtrare
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.resourceId) where.resourceId = filters.resourceId;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Export audit logs în CSV (pentru OWNER/FINANCE)
 */
export async function exportAuditLogsToCSV(filters: any): Promise<string> {
  const { logs } = await getAuditLogs(filters);

  const header = 'Timestamp,User Email,Action,Resource,Resource ID,Details,IP Address\n';
  const rows = logs.map((log: any) =>
    [
      log.createdAt.toISOString(),
      log.user?.email || 'N/A',
      log.action,
      log.resource,
      log.resourceId || 'N/A',
      JSON.stringify(log.details || {}),
      log.ipAddress || 'N/A',
    ].join(',')
  ).join('\n');

  return header + rows;
}
