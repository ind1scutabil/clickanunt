/**
 * POST /api/admin/users/[id]/message — mesaj direct de la admin către un utilizator.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { AdminNotificationSeverity } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { validateSecureRequest } from "@/lib/security/middleware";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  sendDirectPeerMessage,
  SendDirectPeerMessageError,
} from "@/lib/messaging/send-direct-peer-message";

const adminUserMessageSchema = z
  .object({
    content: z.string(),
  })
  .strict()
  .transform(({ content }) => ({
    content:
      typeof content === "string" ? content.trim().replace(/\s+/g, " ") : "",
  }))
  .refine((o) => o.content.length >= 1, {
    message: "Mesajul este obligatoriu",
  })
  .refine((o) => o.content.length <= 2000, {
    message: "Mesajul nu poate depăși 2000 de caractere",
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const adminUser = await getUserFromRequest(request);

    if (
      !adminUser ||
      !hasPermission(adminUser.role as UserRole, Permission.MODERATION_REVIEW)
    ) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "messages",
      schema: adminUserMessageSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { content } = security.data as z.infer<typeof adminUserMessageSchema>;

    if (adminUser.id === targetUserId) {
      return NextResponse.json(
        { error: "Nu poți trimite mesaj către propriul cont" },
        { status: 400 }
      );
    }

    const targetExists = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, deletedAt: true },
    });

    if (!targetExists || targetExists.deletedAt) {
      return NextResponse.json(
        { error: "Utilizatorul nu există sau nu mai este activ" },
        { status: 404 }
      );
    }

    const result = await sendDirectPeerMessage({
      senderId: adminUser.id,
      receiverId: targetUserId,
      content,
    });

    if (!result.duplicate) {
      void createAuditLog({
        userId: adminUser.id,
        action: "admin_direct_message_sent",
        resource: "message",
        resourceId: result.messageId,
        details: {
          targetUserId,
          targetEmail: targetExists.email,
          conversationId: result.conversationId,
          contentLength: content.length,
        },
      });

      void createAdminNotification({
        type: ADMIN_NOTIFICATION_TYPE.AUDIT_IMPORTANT,
        severity: AdminNotificationSeverity.info,
        title: "Mesaj trimis către utilizator",
        message: `Admin → ${targetExists.email}: mesaj direct din panoul de moderare.`,
        entityType: "user",
        entityId: targetUserId,
        metadata: {
          conversationId: result.conversationId,
          messageId: result.messageId,
          adminId: adminUser.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      conversationId: result.conversationId,
      messageId: result.messageId,
    });
  } catch (error: unknown) {
    if (error instanceof SendDirectPeerMessageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/users/message] POST failed:", error);
    return NextResponse.json(
      { error: "Nu am putut trimite mesajul" },
      { status: 500 }
    );
  }
}
