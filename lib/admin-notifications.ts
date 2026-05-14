import type { AdminNotificationSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminNotificationType } from "@/lib/admin-notification-types";

export type CreateAdminNotificationInput = {
  type: AdminNotificationType | string;
  severity: AdminNotificationSeverity;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Best-effort insert: never throws to caller (does not break payment/register/etc.).
 */
export async function createAdminNotification(
  input: CreateAdminNotificationInput
): Promise<void> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return;
  }
  try {
    await prisma.adminNotification.create({
      data: {
        type: String(input.type).slice(0, 64),
        severity: input.severity,
        title: input.title.slice(0, 220),
        message: input.message,
        entityType: input.entityType ? String(input.entityType).slice(0, 40) : null,
        entityId: input.entityId ? String(input.entityId).slice(0, 64) : null,
        metadata: input.metadata === undefined ? undefined : input.metadata,
      },
    });
  } catch (e) {
    console.warn("[admin-notifications] create failed (non-fatal)", e);
  }
}

export async function hasRecentOpenRuleAlert(
  ruleKey: string,
  windowHours = 12
): Promise<boolean> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return false;
  }
  try {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const count = await prisma.adminNotification.count({
      where: {
        resolvedAt: null,
        createdAt: { gte: since },
        metadata: { path: ["ruleKey"], equals: ruleKey },
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}
