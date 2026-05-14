import type { PrismaClient } from "@prisma/client";
import { AdminNotificationSeverity } from "@prisma/client";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import {
  createAdminNotification,
  hasRecentOpenRuleAlert,
} from "@/lib/admin-notifications";

/**
 * Rule-based alerts (cron / analytics). Idempotent per `ruleKey` window.
 */
export async function runAdminNotificationRules(
  db: PrismaClient
): Promise<{ created: number }> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    return { created: 0 };
  }

  let created = 0;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since48h = new Date(now - 48 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const [recentViews, prevViews] = await Promise.all([
      db.analyticsEvent.count({
        where: {
          eventType: ANALYTICS_EVENT.listing_view,
          createdAt: { gte: since24h },
        },
      }),
      db.analyticsEvent.count({
        where: {
          eventType: ANALYTICS_EVENT.listing_view,
          createdAt: { gte: since48h, lt: since24h },
        },
      }),
    ]);

    if (prevViews >= 30 && recentViews < prevViews * 0.6) {
      if (!(await hasRecentOpenRuleAlert("volume_drop_listing_views", 12))) {
        await createAdminNotification({
          type: ADMIN_NOTIFICATION_TYPE.RULE_VOLUME_DROP,
          severity: AdminNotificationSeverity.warning,
          title: "Trafic vizualizări anunțuri în scădere",
          message: `În ultimele 24h au fost ${recentViews} evenimente listing_view, față de ${prevViews} în intervalul anterior (24–48h). Scădere peste pragul de 40%.`,
          metadata: {
            ruleKey: "volume_drop_listing_views",
            recentViews,
            prevViews,
          },
        });
        created += 1;
      }
    }
  } catch {
    /* non-fatal */
  }

  try {
    const rapid = await db.$queryRaw<{ ownerUserId: string; c: bigint }[]>`
      SELECT "ownerUserId", COUNT(*)::bigint AS c
      FROM listings
      WHERE "createdAt" >= ${twoHoursAgo} AND "deletedAt" IS NULL
      GROUP BY "ownerUserId"
      HAVING COUNT(*) >= 8
    `;
    for (const row of rapid) {
      const ownerId = row.ownerUserId;
      const recentSame = await db.adminNotification.count({
        where: {
          type: ADMIN_NOTIFICATION_TYPE.RULE_RAPID_LISTINGS,
          entityType: "user",
          entityId: ownerId,
          createdAt: { gte: new Date(now - 6 * 60 * 60 * 1000) },
        },
      });
      if (recentSame > 0) continue;
      await createAdminNotification({
        type: ADMIN_NOTIFICATION_TYPE.RULE_RAPID_LISTINGS,
        severity: AdminNotificationSeverity.warning,
        title: "Activitate intensă: multe anunțuri noi",
        message: `Utilizatorul ${ownerId} a creat ${String(row.c)} anunțuri în ultimele 2 ore.`,
        entityType: "user",
        entityId: ownerId,
        metadata: { ruleKey: "rapid_listings", count: Number(row.c) },
      });
      created += 1;
    }
  } catch {
    /* non-fatal */
  }

  try {
    const dupIp = await db.$queryRaw<{ ip: string; c: bigint }[]>`
      SELECT "lastLoginIp" AS ip, COUNT(*)::bigint AS c
      FROM users
      WHERE "lastLoginIp" IS NOT NULL
        AND "deletedAt" IS NULL
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY "lastLoginIp"
      HAVING COUNT(*) >= 3
    `;
    for (const row of dupIp) {
      if (!row.ip) continue;
      const ruleKey = `multi_account_ip:${row.ip}`;
      if (await hasRecentOpenRuleAlert(ruleKey, 24)) continue;
      await createAdminNotification({
        type: ADMIN_NOTIFICATION_TYPE.RULE_MULTI_ACCOUNT_IP,
        severity: AdminNotificationSeverity.warning,
        title: "IP comun pe mai multe conturi",
        message: `Adresa ${row.ip} apare la ${String(row.c)} conturi create în ultimele 7 zile.`,
        entityType: "ip",
        entityId: row.ip.slice(0, 64),
        metadata: { ruleKey, count: Number(row.c) },
      });
      created += 1;
    }
  } catch {
    /* non-fatal */
  }

  try {
    const orphanCount = await db.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c
      FROM analytics_events e
      WHERE e."sessionId" IS NOT NULL
        AND e."createdAt" >= ${sevenDaysAgo}
        AND NOT EXISTS (SELECT 1 FROM analytics_sessions s WHERE s.id = e."sessionId")
    `;
    const c = Number(orphanCount[0]?.c ?? 0);
    if (c >= 50) {
      const ruleKey = "orphan_analytics_events";
      if (!(await hasRecentOpenRuleAlert(ruleKey, 24))) {
        await createAdminNotification({
          type: ADMIN_NOTIFICATION_TYPE.RULE_ORPHAN_ANALYTICS,
          severity: AdminNotificationSeverity.warning,
          title: "Evenimente analytics fără sesiune",
          message: `Există ${c} evenimente cu sessionId orfan (ultimele 7 zile). Verifică ingest / migrări.`,
          metadata: { ruleKey: "orphan_analytics_events", orphanCount: c },
        });
        created += 1;
      }
    }
  } catch {
    /* non-fatal */
  }

  try {
    const noPhotos = await db.listing.count({
      where: {
        status: "active",
        deletedAt: null,
        photos: { equals: [] },
      },
    });
    if (noPhotos >= 1) {
      const ruleKey = "active_listing_no_photos";
      if (!(await hasRecentOpenRuleAlert(ruleKey, 12))) {
        await createAdminNotification({
          type: ADMIN_NOTIFICATION_TYPE.RULE_ACTIVE_NO_PHOTOS,
          severity: AdminNotificationSeverity.critical,
          title: "Anunțuri active fără imagini",
          message: `Există ${noPhotos} anunțuri active cu lista de poze goală. Verifică fluxul de upload / migrare.`,
          metadata: { ruleKey: "active_listing_no_photos", noPhotos },
        });
        created += 1;
      }
    }
  } catch {
    /* non-fatal */
  }

  try {
    const since2h = new Date(now - 2 * 60 * 60 * 1000);
    const errCount = await db.systemErrorLog.count({
      where: {
        createdAt: { gte: since2h },
        OR: [
          { source: { contains: "message", mode: "insensitive" } },
          { message: { contains: "MSG-POST", mode: "insensitive" } },
          { message: { contains: "messaging", mode: "insensitive" } },
        ],
      },
    });
    if (errCount >= 5) {
      const ruleKey = "messaging_system_errors";
      if (!(await hasRecentOpenRuleAlert(ruleKey, 6))) {
        await createAdminNotification({
          type: ADMIN_NOTIFICATION_TYPE.RULE_MESSAGING_ERRORS,
          severity: AdminNotificationSeverity.critical,
          title: "Erori repetate în zona mesajelor",
          message: `În ultimele 2 ore au fost ${errCount} înregistrări în system_error_logs legate de mesaje. Verifică Redis / API mesaje.`,
          metadata: { ruleKey: "messaging_system_errors", errCount },
        });
        created += 1;
      }
    }
  } catch {
    /* non-fatal */
  }

  return { created };
}
