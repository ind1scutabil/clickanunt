import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messageSendSchema, uuidSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";
import { publishToUsers } from "@/lib/messaging-sse-hub";
import { messagingUserIdsEqual } from "@/lib/messaging-user-id";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send email notification for new message
 */
async function sendMessageNotificationEmail(
  recipientEmail: string,
  senderName: string,
  messagePreview: string
) {
  try {
    // Use nodemailer or your email service
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('Email service not configured, skipping notification');
      return;
    }

    // Send via SMTP (implement with nodemailer)
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: recipientEmail,
      subject: `Mesaj nou de la ${senderName} - ClickAnunț`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #6D5BFF;">Ai primit un mesaj nou!</h2>
          <p><strong>${senderName}</strong> ți-a trimis un mesaj:</p>
          <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #6D5BFF; margin: 20px 0;">
            "${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"
          </p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages" 
               style="background: #6D5BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Vezi mesajul complet
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            © 2026 ClickAnunț. Toate drepturile rezervate.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
    // Don't throw - email is optional
  }
}

/**
 * GET /api/messages/[userId]
 * Get messages with specific user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const idCheck = uuidSchema.safeParse(params.userId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const payload = await getMessagingApiAuthPayload(request);

    if (!payload) {
      const lid = request.nextUrl.searchParams.get("listingId");
      console.warn("[api/messages] auth:no-payload", {
        method: "GET",
        peerUserId: params.userId,
        listingId: lid ?? undefined,
        hasAccessCookie: !!request.cookies.get("accessToken")?.value,
        hasAuthorization: !!request.headers.get("authorization"),
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUserId = payload.userId || (payload as { sub?: string }).sub;
    if (!currentUserId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }
    const otherUserId = params.userId;
    const listingIdParam = request.nextUrl.searchParams.get("listingId")?.trim();
    const conversationIdParam = request.nextUrl.searchParams.get("conversationId")?.trim();

    if (listingIdParam) {
      const listingCheck = uuidSchema.safeParse(listingIdParam);
      if (!listingCheck.success) {
        return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
      }
    }

    if (conversationIdParam) {
      const conversationCheck = uuidSchema.safeParse(conversationIdParam);
      if (!conversationCheck.success) {
        return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
      }
    }

    const messageInclude = {
      orderBy: { createdAt: "asc" as const },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, avatar: true, email: true, role: true },
        },
      },
    };

    let conversation = null;

    if (conversationIdParam) {
      /** Preferă id-ul conversației — evită ratări când userId din URL nu coincide cu participantul (ex. race / bookmark). */
      const byId = await prisma.conversation.findUnique({
        where: { id: conversationIdParam },
        include: {
          messages: messageInclude,
          participant1: { select: { id: true, name: true, avatar: true, email: true, role: true } },
          participant2: { select: { id: true, name: true, avatar: true, email: true, role: true } },
        },
      });
      if (byId) {
        const isParticipant =
          messagingUserIdsEqual(byId.participant1Id, currentUserId) ||
          messagingUserIdsEqual(byId.participant2Id, currentUserId);
        if (!isParticipant) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const otherParticipantId =
          messagingUserIdsEqual(byId.participant1Id, currentUserId)
            ? byId.participant2Id
            : byId.participant1Id;
        if (!messagingUserIdsEqual(otherParticipantId, otherUserId)) {
          console.warn(
            "[messages GET] userId path mismatch vs conversation participants",
            { userId: otherUserId, expected: otherParticipantId, conversationId: conversationIdParam }
          );
        }
        conversation = byId;
      }
    }

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1Id: currentUserId, participant2Id: otherUserId },
            { participant1Id: otherUserId, participant2Id: currentUserId },
          ],
          ...(listingIdParam ? { listingId: listingIdParam } : {}),
        },
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: messageInclude,
          participant1: { select: { id: true, name: true, avatar: true, email: true, role: true } },
          participant2: { select: { id: true, name: true, avatar: true, email: true, role: true } },
        },
      });
    }

    if (!conversation) {
      return NextResponse.json(
        {
          conversationId: null as string | null,
          listingId: listingIdParam ?? null,
          messages: [],
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        receiverId: currentUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log("[api/messages] GET-thread", {
      conversationId: conversation.id,
      listingId: conversation.listingId,
      peerUserId: otherUserId,
      viewerId: currentUserId,
      messagesReturned: conversation.messages.length,
    });

    return NextResponse.json(
      {
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        messages: conversation.messages,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/[userId]
 * Send message to user
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  console.log('[MSG-POST] ===== MESSAGE SEND REQUEST RECEIVED =====');
  const startTime = Date.now();
  
  try {
    const params = await context.params;
    const idCheck = uuidSchema.safeParse(params.userId);
    if (!idCheck.success) {
      console.log('[MSG-POST] Invalid userId format:', params.userId);
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    console.log('[MSG-POST] Recipient userId:', params.userId);

    const payload = await getMessagingApiAuthPayload(request);
    console.log(
      "[MSG-POST] Token sources - cookie:",
      !!request.cookies.get("accessToken")?.value,
      "header:",
      !!request.headers.get("authorization")
    );

    if (!payload) {
      console.warn("[api/messages] auth:no-payload", {
        method: "POST",
        peerUserId: params.userId,
        hasAccessCookie: !!request.cookies.get("accessToken")?.value,
        hasAuthorization: !!request.headers.get("authorization"),
      });
      console.log('[MSG-POST] ❌ Authentication failed - no valid token');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('[MSG-POST] ✓ Token verified');

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'messages',
      schema: messageSendSchema,
    });

    if (!security.success) {
      console.log('[MSG-POST] ❌ Security validation failed:', security.error);
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    console.log('[MSG-POST] ✓ Security validation passed');

    const { content, listingId, conversationId } = security.data as {
      content: string;
      listingId?: string;
      conversationId?: string;
    };

    if (!content || content.trim().length === 0) {
      console.log('[MSG-POST] ❌ Empty message content');
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    console.log('[MSG-POST] Message content length:', content.trim().length, 'bytes');

    const senderId = payload.userId || (payload as { sub?: string }).sub;
    if (!senderId) {
      console.log('[MSG-POST] ❌ Could not extract senderId from token');
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const pathUserId = params.userId;
    console.log('[MSG-POST] Sender:', senderId, '-> Path userId:', pathUserId);

    let conversation: Awaited<
      ReturnType<typeof prisma.conversation.findUnique>
    > | null = null;
    let effectiveReceiverId: string;

    if (conversationId) {
      /** Ca la GET: id-ul thread-ului e sursa de adevăr; userId din URL poate fi desincronizat. */
      const byId = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!byId) {
        console.log('[MSG-POST] ❌ Conversation not found:', conversationId);
        return NextResponse.json(
          { error: "Conversation not found for selected thread" },
          { status: 409 }
        );
      }
      const isP1 = messagingUserIdsEqual(byId.participant1Id, senderId);
      const isP2 = messagingUserIdsEqual(byId.participant2Id, senderId);
      if (!isP1 && !isP2) {
        console.log('[MSG-POST] ❌ Sender is not a participant');
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      effectiveReceiverId = isP1 ? byId.participant2Id : byId.participant1Id;
      if (!messagingUserIdsEqual(effectiveReceiverId, pathUserId)) {
        console.warn("[MSG-POST] Path userId ≠ other participant; using conversation", {
          pathUserId,
          effectiveReceiverId,
          conversationId,
        });
      }
      conversation = byId;
    } else {
      effectiveReceiverId = pathUserId;
      conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1Id: senderId, participant2Id: effectiveReceiverId },
            { participant1Id: effectiveReceiverId, participant2Id: senderId },
          ],
          ...(listingId ? { listingId } : { listingId: null }),
        },
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: effectiveReceiverId },
    });

    if (!receiver) {
      console.log('[MSG-POST] ❌ Receiver not found:', effectiveReceiverId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log('[MSG-POST] ✓ Receiver:', receiver.email);

    if (!conversation) {
      console.log('[MSG-POST] Creating new conversation...');
      const participant1Id =
        senderId < effectiveReceiverId ? senderId : effectiveReceiverId;
      const participant2Id =
        senderId < effectiveReceiverId ? effectiveReceiverId : senderId;

      const listingFilter = listingId ? { listingId } : { listingId: null };

      try {
        conversation = await prisma.conversation.create({
          data: {
            participant1Id,
            participant2Id,
            listingId: listingId || null,
          },
        });
        console.log('[MSG-POST] ✓ Conversation created:', conversation.id);
      } catch (e: unknown) {
        /** Cursă: două cereri paralele creează același thread — unique @@([participants], listingId). */
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          console.log('[MSG-POST] Race on conversation create — reloading row');
          conversation = await prisma.conversation.findFirst({
            where: {
              OR: [
                { participant1Id: senderId, participant2Id: effectiveReceiverId },
                { participant1Id: effectiveReceiverId, participant2Id: senderId },
              ],
              ...listingFilter,
            },
          });
          if (!conversation) {
            throw e;
          }
          console.log('[MSG-POST] ✓ Using existing conversation after race:', conversation.id);
        } else {
          throw e;
        }
      }
    } else {
      console.log('[MSG-POST] ✓ Using existing conversation:', conversation.id);
    }

    // Create message
    console.log('[MSG-POST] Creating message...');
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId: effectiveReceiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    console.log('[MSG-POST] ✓ Message created:', message.id);

    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.message_sent,
      userId: senderId,
      listingId: conversation.listingId ?? undefined,
      metadata: {
        conversationId: conversation.id,
        messageId: message.id,
        receiverUserId: effectiveReceiverId,
      },
      request,
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    console.log('[MSG-POST] ✓ Conversation updated');

    // Send email notification to recipient (async, don't wait)
    if (receiver.email) {
      const senderName = message.sender.name || message.sender.email || "Utilizator";
      sendMessageNotificationEmail(
        receiver.email,
        senderName,
        content.trim()
      ).catch(err => console.error('Email notification error:', err));
    }

    const elapsed = Date.now() - startTime;
    console.log(`[MSG-POST] ✅ SUCCESS - Message ${message.id} sent in ${elapsed}ms`);

    console.log("[MSG-POST] sse-publish", {
      createdMessageId: message.id,
      conversationId: conversation.id,
      listingId: conversation.listingId ?? null,
      senderId,
      receiverId: effectiveReceiverId,
    });

    publishToUsers([senderId, effectiveReceiverId], {
      type: "message",
      conversationId: conversation.id,
      listingId: conversation.listingId ?? null,
      senderId,
      receiverId: effectiveReceiverId,
      messageId: message.id,
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message,
    });
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    console.error(`[MSG-POST] ❌ EXCEPTION (${elapsed}ms):`, error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
