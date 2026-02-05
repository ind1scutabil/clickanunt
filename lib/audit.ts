/**
 * Audit Log System - IMUABIL
 * Tracking complet pentru owner control
 */

import { prisma } from './prisma';
import { UserRole } from '@prisma/client';
import { TokenPayload } from './auth';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  before?: any;
  after?: any;
  metadata?: any;
}

/**
 * Creează intrare în audit log (IMUABIL - nu poate fi ștearsă)
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        userEmail: entry.userEmail || null,
        userRole: entry.userRole || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        before: entry.before || null,
        after: entry.after || null,
        metadata: entry.metadata || null,
        timestamp: new Date(),
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
  entityType: string,
  entityId?: string,
  before?: any,
  after?: any,
  metadata?: any
): Promise<void> {
  await createAuditLog({
    userId: user?.userId,
    userEmail: user?.email,
    userRole: user?.role as UserRole,
    action,
    entityType,
    entityId,
    before,
    after,
    metadata,
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
      userEmail: email,
      action: 'user.login',
      entityType: 'user',
      entityId: userId,
      metadata: { ip },
    }),

  userLogout: (userId: string, email: string) =>
    createAuditLog({
      userId,
      userEmail: email,
      action: 'user.logout',
      entityType: 'user',
      entityId: userId,
    }),

  userCreated: (actor: TokenPayload, newUser: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'user.create',
      entityType: 'user',
      entityId: newUser.id,
      after: newUser,
    }),

  userUpdated: (actor: TokenPayload, userId: string, before: any, after: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'user.update',
      entityType: 'user',
      entityId: userId,
      before,
      after,
    }),

  userBanned: (actor: TokenPayload, userId: string, reason: string, before: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'user.ban',
      entityType: 'user',
      entityId: userId,
      before,
      after: { isBanned: true, banReason: reason },
    }),

  userUnbanned: (actor: TokenPayload, userId: string, before: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'user.unban',
      entityType: 'user',
      entityId: userId,
      before,
      after: { isBanned: false },
    }),

  userRoleChanged: (actor: TokenPayload, userId: string, oldRole: string, newRole: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'user.roleChange',
      entityType: 'user',
      entityId: userId,
      before: { role: oldRole },
      after: { role: newRole },
    }),

  // Listing actions
  listingCreated: (userId: string, listing: any) =>
    createAuditLog({
      userId,
      action: 'listing.create',
      entityType: 'listing',
      entityId: listing.id,
      after: listing,
    }),

  listingUpdated: (userId: string, listingId: string, before: any, after: any) =>
    createAuditLog({
      userId,
      action: 'listing.update',
      entityType: 'listing',
      entityId: listingId,
      before,
      after,
    }),

  listingDeleted: (actor: TokenPayload, listingId: string, before: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'listing.delete',
      entityType: 'listing',
      entityId: listingId,
      before,
    }),

  listingApproved: (actor: TokenPayload, listingId: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'listing.approve',
      entityType: 'listing',
      entityId: listingId,
      after: { moderationStatus: 'approved' },
    }),

  listingRejected: (actor: TokenPayload, listingId: string, reason: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'listing.reject',
      entityType: 'listing',
      entityId: listingId,
      after: { moderationStatus: 'rejected', rejectionReason: reason },
    }),

  listingFeatured: (actor: TokenPayload, listingId: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'listing.feature',
      entityType: 'listing',
      entityId: listingId,
      after: { isFeatured: true },
    }),

  // Report actions
  reportCreated: (userId: string, report: any) =>
    createAuditLog({
      userId,
      action: 'report.create',
      entityType: 'report',
      entityId: report.id,
      after: report,
    }),

  reportResolved: (actor: TokenPayload, reportId: string, resolution: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'report.resolve',
      entityType: 'report',
      entityId: reportId,
      after: { status: 'resolved', resolution },
    }),

  // Appeal actions
  appealCreated: (userId: string, appeal: any) =>
    createAuditLog({
      userId,
      action: 'appeal.create',
      entityType: 'appeal',
      entityId: appeal.id,
      after: appeal,
    }),

  appealReviewed: (actor: TokenPayload, appealId: string, decision: string, response: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'appeal.review',
      entityType: 'appeal',
      entityId: appealId,
      after: { status: decision, response },
    }),

  // Settings actions
  settingsUpdated: (actor: TokenPayload, key: string, before: any, after: any) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'settings.update',
      entityType: 'settings',
      entityId: key,
      before,
      after,
    }),

  // Payment actions
  paymentCreated: (userId: string, payment: any) =>
    createAuditLog({
      userId,
      action: 'payment.create',
      entityType: 'payment',
      entityId: payment.id,
      after: payment,
    }),

  paymentRefunded: (actor: TokenPayload, paymentId: string, reason: string) =>
    createAuditLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role as UserRole,
      action: 'payment.refund',
      entityType: 'payment',
      entityId: paymentId,
      metadata: { reason },
    }),
};

/**
 * Obține audit logs cu filtrare
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;

  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
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

  const header = 'Timestamp,User Email,Role,Action,Entity Type,Entity ID,Before,After,Metadata\n';
  const rows = logs.map((log: any) =>
    [
      log.timestamp.toISOString(),
      log.userEmail || 'N/A',
      log.userRole || 'N/A',
      log.action,
      log.entityType,
      log.entityId || 'N/A',
      JSON.stringify(log.before || {}),
      JSON.stringify(log.after || {}),
      JSON.stringify(log.metadata || {}),
    ].join(',')
  ).join('\n');

  return header + rows;
}
