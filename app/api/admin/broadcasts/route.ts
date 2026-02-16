/**
 * API Route: Admin - Broadcast Messages
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { sendBulkEmail } from "@/lib/mailer";
import { validateSecureRequest } from "@/lib/security/middleware";
import type { UserRole } from "@prisma/client";

type BroadcastUser = { id: string; email: string | null };

function getSegmentWhere(segment: string) {
  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (segment) {
    case 'active':
      return { isBanned: false, lastLoginAt: { gte: days30 } };
    case 'inactive':
      return { OR: [{ lastLoginAt: { lt: days30 } }, { lastLoginAt: null }] };
    case 'new':
      return { createdAt: { gte: days7 } };
    case 'banned':
      return { isBanned: true };
    default:
      return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || !hasPermission(user.role as UserRole, Permission.SETTINGS_VIEW)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const broadcasts = await prisma.adminBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        message: true,
        channels: true,
        segment: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, broadcasts });
  } catch (error) {
    console.error('Get broadcasts error:', error);
    return NextResponse.json({ error: "Eroare la obținerea broadcast-urilor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [BROADCAST API] Request received');
    const user = await getUserFromRequest(request);
    console.log('🔵 [BROADCAST API] User:', user?.email, 'Role:', user?.role);

    if (!user || !hasPermission(user.role as UserRole, Permission.SETTINGS_UPDATE)) {
      console.log('❌ [BROADCAST API] Permission denied');
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    console.log('🔵 [BROADCAST API] Starting CSRF validation...');
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
    });
    console.log('🔵 [BROADCAST API] Security validation result:', {
      success: security.success,
      error: security.error,
      csrfError: security.csrfError,
      hasData: !!security.data
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      console.log('❌ [BROADCAST API] Security validation failed:', security.error);
      return NextResponse.json({ error: security.error }, { status });
    }

    console.log('🔵 [BROADCAST API] Security data:', security.data);
    
    const { title, message, channels, segment, schedule, scheduledAt } =
      security.data as {
        title?: string;
        message?: string;
        channels?: { email?: boolean; inApp?: boolean; sms?: boolean };
        segment?: string;
        schedule?: string;
        scheduledAt?: string | null;
      };

    console.log('🔵 [BROADCAST API] Extracted values:', { title, message, channels, segment, schedule });

    if (!title || !message) {
      console.log('❌ [BROADCAST API] Missing title or message');
      return NextResponse.json({ error: "Titlu și mesaj sunt necesare" }, { status: 400 });
    }

    const isScheduled = schedule === 'later' && scheduledAt;
    const broadcast = await prisma.adminBroadcast.create({
      data: {
        title,
        message,
        channels: channels || { email: false, inApp: true, sms: false },
        segment: segment || 'all',
        status: isScheduled ? 'scheduled' : 'sent',
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        sentAt: isScheduled ? null : new Date(),
        createdBy: user.id,
      },
    });

    if (isScheduled) {
      await createAuditLog({
        userId: user.id,
        action: 'broadcast.schedule',
        resource: 'broadcast',
        resourceId: broadcast.id,
        details: { title, segment },
      });

      return NextResponse.json({
        success: true,
        broadcast,
        scheduled: true,
      });
    }

    const where = getSegmentWhere(segment || 'all');
    const users: BroadcastUser[] = await prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });

    let notificationsCreated = 0;
    if (channels?.inApp !== false) {
      const batchSize = 1000;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const data = batch.map((u: BroadcastUser) => ({
          userId: u.id,
          broadcastId: broadcast.id,
          title,
          message,
        }));
        if (data.length > 0) {
          await prisma.userNotification.createMany({ data, skipDuplicates: true });
          notificationsCreated += data.length;
        }
      }
    }

    let emailResult = { sent: 0, skipped: 0 };
    if (channels?.email) {
      const emails = users.map((u: BroadcastUser) => u.email).filter((email): email is string => !!email);
      emailResult = await sendBulkEmail(emails, title, `<p>${message}</p>`);
    }

    await createAuditLog({
      userId: user.id,
      action: 'broadcast.send',
      resource: 'broadcast',
      resourceId: broadcast.id,
      details: {
        title,
        segment,
        channels,
        notificationsCreated,
        emailsSent: emailResult.sent,
      },
    });

    return NextResponse.json({
      success: true,
      broadcast,
      delivered: {
        notifications: notificationsCreated,
        emailsSent: emailResult.sent,
        emailsSkipped: emailResult.skipped,
      },
    });
  } catch (error) {
    console.error('Broadcast send error:', error);
    return NextResponse.json({ error: "Eroare la trimiterea mesajului" }, { status: 500 });
  }
}
