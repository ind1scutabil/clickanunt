import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messageSendSchema, uuidSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";
import { messagingPublishSse, publishToUsers } from "@/lib/messaging-sse-hub";
import { canonicalMessagingUserId, messagingUserIdsEqual } from "@/lib/messaging-user-id";
import { conversationParticipantSlots } from "@/lib/messaging-conversation-participants";
import { normalizeMessagingContent } from "@/lib/messaging-content";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import { AdminNotificationSeverity } from "@prisma/client";
import { ADMIN_NOTIFICATION_TYPE } from "@/lib/admin-notification-types";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  messagingRequestCorrelation,
  messagingStructuredLog,
} from "@/lib/messaging-observability";
import { promObserveHttpMessagePost } from "@/lib/messaging-prometheus";
import { resolveListingConversationPeer } from "@/lib/messaging/listing-contact";

const MESSAGE_DEDUPE_MS = 60_000;

/** Participant projection for messaging APIs — no email/phone (peer PII minimization). */
const messagingParticipantSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
} as const;

const messagePostInclude = {
  sender: { select: messagingParticipantSelect },
  receiver: { select: messagingParticipantSelect },
} as const;

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
  const corr = messagingRequestCorrelation(request);
  const opStartedAt = Date.now();
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
    const viewerCanon =
      canonicalMessagingUserId(currentUserId) ?? currentUserId.trim().toLowerCase();
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

    const participantMini = {
      select: messagingParticipantSelect,
    };

    const messageRowInclude = {
      sender: { select: messagingParticipantSelect },
      receiver: { select: messagingParticipantSelect },
    } as const;

    let conversation = null;

    if (conversationIdParam) {
      /** Preferă id-ul conversației — evită ratări când userId din URL nu coincide cu participantul (ex. race / bookmark). */
      const byId = await prisma.conversation.findUnique({
        where: { id: conversationIdParam },
        include: {
          participant1: participantMini,
          participant2: participantMini,
        },
      });
      if (byId) {
        const isParticipant =
          messagingUserIdsEqual(byId.participant1Id, viewerCanon) ||
          messagingUserIdsEqual(byId.participant2Id, viewerCanon);
        if (!isParticipant) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const otherParticipantId =
          messagingUserIdsEqual(byId.participant1Id, viewerCanon)
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
      /** Fără conversationId: NU lăsăm listingId „wildcard” — întorceam ultimul fir între pereche și stricam sync pe anunț/DM. */
      const peerCanon =
        canonicalMessagingUserId(otherUserId) ?? otherUserId.trim().toLowerCase();
      const slots = conversationParticipantSlots(viewerCanon, peerCanon);
      const listingFilter =
        listingIdParam && listingIdParam.length > 0
          ? ({ listingId: listingIdParam } as const)
          : ({ listingId: null } as const);
      conversation = await prisma.conversation.findFirst({
        where: {
          participant1Id: slots.participant1Id,
          participant2Id: slots.participant2Id,
          ...listingFilter,
        },
        orderBy: { lastMessageAt: "desc" },
        include: {
          participant1: participantMini,
          participant2: participantMini,
        },
      });
    }

    if (!conversation) {
      console.log("[MSG_DEBUG] FETCH MESSAGES", {
        currentUserId: viewerCanon,
        conversationId: null,
        messageCount: 0,
        listingIdParam: listingIdParam ?? null,
        peerUserIdPath: otherUserId,
        note: "no_conversation_match",
      });
    messagingStructuredLog("message_receive", {
      requestId: corr.requestId,
      userId: viewerCanon,
      conversationId: null,
      messageCountOnPage: 0,
      hasOlderMessages: false,
      durationMs: Date.now() - opStartedAt,
      note: "no_conversation",
    });

    return NextResponse.json(
      {
        conversationId: null as string | null,
        listingId: listingIdParam ?? null,
        messages: [],
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
    }

    const peerForEvents = messagingUserIdsEqual(
      conversation.participant1Id,
      viewerCanon
    )
      ? conversation.participant2Id
      : conversation.participant1Id;

    const limitParam = request.nextUrl.searchParams.get("limit");
    const beforeCursor = request.nextUrl.searchParams.get("before")?.trim();

    let pageLimit = 60;
    if (limitParam) {
      const n = Number.parseInt(limitParam, 10);
      if (!Number.isFinite(n) || n < 10 || n > 150) {
        return NextResponse.json(
          { error: "Invalid limit (10–150)" },
          { status: 400 }
        );
      }
      pageLimit = n;
    }

    let cursorAnchorId: string | undefined;
    if (beforeCursor !== undefined && beforeCursor.length > 0) {
      const cur = uuidSchema.safeParse(beforeCursor);
      if (!cur.success) {
        return NextResponse.json({ error: "Invalid before cursor" }, { status: 400 });
      }
      const anchor = await prisma.message.findFirst({
        where: { id: cur.data, conversationId: conversation.id },
        select: { id: true },
      });
      if (!anchor) {
        return NextResponse.json({ error: "Invalid message cursor for thread" }, { status: 400 });
      }
      cursorAnchorId = anchor.id;
    }

    const take = pageLimit + 1;
    const pageRowsDesc = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursorAnchorId ? { cursor: { id: cursorAnchorId }, skip: 1 } : {}),
      include: messageRowInclude,
    });

    const hasOlder = pageRowsDesc.length > pageLimit;
    const sliceDesc = pageRowsDesc.slice(0, pageLimit);
    const messagesAsc = [...sliceDesc].reverse();

    const readBatch = await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        receiverId: viewerCanon,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    let deliveredBatch = { count: 0 };
    const visibleIds = messagesAsc.map((m) => m.id);
    if (visibleIds.length > 0) {
      try {
        deliveredBatch = await prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            id: { in: visibleIds },
            receiverId: viewerCanon,
            deliveredAt: null,
          },
          data: { deliveredAt: new Date() },
        });
      } catch {
        /** DB fără coloana `deliveredAt` (migrare neaplicată) — nu rupe întreg GET thread. */
        deliveredBatch = { count: 0 };
      }
    }

    if (readBatch.count > 0) {
      messagingStructuredLog("read_receipt", {
        requestId: corr.requestId,
        userId: viewerCanon,
        conversationId: conversation.id,
        markedReadApprox: readBatch.count,
      });
      messagingPublishSse([peerForEvents], "read_receipt", {
        type: "read_receipt",
        conversationId: conversation.id,
        markedReadApprox: readBatch.count,
      });
      messagingPublishSse([viewerCanon, peerForEvents], "conversation_update", {
        type: "conversation_update",
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        reason: "messages_read",
      });
    }

    if (deliveredBatch.count > 0) {
      messagingStructuredLog("delivery_receipt", {
        requestId: corr.requestId,
        userId: viewerCanon,
        conversationId: conversation.id,
        markedDeliveredApprox: deliveredBatch.count,
      });
      messagingPublishSse([peerForEvents], "delivery_receipt", {
        type: "delivery_receipt",
        conversationId: conversation.id,
        markedDeliveredApprox: deliveredBatch.count,
      });
    }

    console.log("[api/messages] GET-thread", {
      conversationId: conversation.id,
      listingId: conversation.listingId,
      peerUserId: otherUserId,
      viewerId: viewerCanon,
      messagesReturned: messagesAsc.length,
      hasOlder,
      readMarked: readBatch.count,
      deliveredMarked: deliveredBatch.count,
    });
    console.log("[MSG_DEBUG] FETCH MESSAGES", {
      currentUserId: viewerCanon,
      conversationId: conversation.id,
      messageCount: messagesAsc.length,
      listingId: conversation.listingId ?? null,
    });

    const approxPayloadBytes =
      Buffer.byteLength(
        JSON.stringify({
          conversationId: conversation.id,
          messages: messagesAsc,
        }),
        "utf8"
      ) ?? 0;

    messagingStructuredLog("message_receive", {
      requestId: corr.requestId,
      userId: viewerCanon,
      conversationId: conversation.id,
      messageCountOnPage: messagesAsc.length,
      hasOlderMessages: hasOlder,
      durationMs: Date.now() - opStartedAt,
      approxPayloadBytes,
    });

    return NextResponse.json(
      {
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        messages: messagesAsc,
        pagination: {
          limit: pageLimit,
          hasOlderMessages: hasOlder,
          oldestMessageIdOnPage:
            messagesAsc.length > 0 ? messagesAsc[0].id : null,
          newestMessageIdOnPage:
            messagesAsc.length > 0 ? messagesAsc[messagesAsc.length - 1].id : null,
        },
        approxPayloadBytes,
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
  const corr = messagingRequestCorrelation(request);
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

    const sanitizedContent = normalizeMessagingContent(content);
    if (sanitizedContent.length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }
    if (sanitizedContent.length > 5000) {
      return NextResponse.json(
        { error: "Message content is too long" },
        { status: 400 }
      );
    }

    console.log("[MSG-POST] Message normalized length:", sanitizedContent.length);

    const senderId = payload.userId || (payload as { sub?: string }).sub;
    if (!senderId) {
      console.log('[MSG-POST] ❌ Could not extract senderId from token');
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const senderCanon =
      canonicalMessagingUserId(senderId) ?? String(senderId).trim().toLowerCase();

    const senderProfile = await prisma.user.findUnique({
      where: { id: senderCanon },
      select: { isBanned: true, deletedAt: true },
    });
    if (!senderProfile || senderProfile.deletedAt || senderProfile.isBanned) {
      return NextResponse.json(
        { error: "Cont indisponibil pentru mesaje" },
        { status: 403 }
      );
    }

    const pathUserId = params.userId;
    console.log('[MSG-POST] Sender:', senderCanon, '-> Path userId:', pathUserId);

    let conversation: Awaited<
      ReturnType<typeof prisma.conversation.findUnique>
    > | null = null;
    let effectiveReceiverId: string;
    let resolvedListingId: string | null = listingId ?? null;

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
      const isP1 = messagingUserIdsEqual(byId.participant1Id, senderCanon);
      const isP2 = messagingUserIdsEqual(byId.participant2Id, senderCanon);
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
      resolvedListingId = byId.listingId ?? resolvedListingId;
    } else if (listingId) {
      /** Seller derived from Listing — client path userId must match owner. */
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          ownerUserId: true,
          status: true,
          moderationStatus: true,
          deletedAt: true,
          expiresAt: true,
        },
      });
      if (!listing) {
        return NextResponse.json({ error: "Anunțul nu există" }, { status: 404 });
      }
      const peerDecision = resolveListingConversationPeer({
        listing,
        senderId: senderCanon,
        pathPeerUserId: pathUserId,
      });
      if (!peerDecision.ok) {
        return NextResponse.json(
          { error: peerDecision.error },
          { status: peerDecision.status }
        );
      }
      effectiveReceiverId = peerDecision.ownerUserId;
      resolvedListingId = listing.id;
      const slots = conversationParticipantSlots(senderCanon, effectiveReceiverId);
      conversation = await prisma.conversation.findFirst({
        where: {
          participant1Id: slots.participant1Id,
          participant2Id: slots.participant2Id,
          listingId: listing.id,
        },
      });
      if (!conversation && !peerDecision.contactableForNew) {
        return NextResponse.json(
          { error: "Anunțul nu poate fi contactat" },
          { status: 403 }
        );
      }
    } else {
      effectiveReceiverId =
        canonicalMessagingUserId(pathUserId) ?? pathUserId.trim().toLowerCase();
      if (messagingUserIdsEqual(senderCanon, effectiveReceiverId)) {
        return NextResponse.json(
          { error: "Nu poți trimite mesaj către propriul cont" },
          { status: 400 }
        );
      }
      const slots = conversationParticipantSlots(senderCanon, effectiveReceiverId);
      conversation = await prisma.conversation.findFirst({
        where: {
          participant1Id: slots.participant1Id,
          participant2Id: slots.participant2Id,
          listingId: null,
        },
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: effectiveReceiverId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isBanned: true,
        deletedAt: true,
      },
    });

    if (!receiver) {
      console.log('[MSG-POST] ❌ Receiver not found:', effectiveReceiverId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (receiver.deletedAt || receiver.isBanned) {
      return NextResponse.json(
        { error: "Destinatar indisponibil pentru mesaje" },
        { status: 403 }
      );
    }

    console.log("[MSG-POST] ✓ Receiver id:", receiver.id);

    let justCreatedConversation = false;
    if (!conversation) {
      console.log('[MSG-POST] Creating new conversation...');
      const slots = conversationParticipantSlots(senderCanon, effectiveReceiverId);
      const listingFilter = resolvedListingId
        ? ({ listingId: resolvedListingId } as const)
        : ({ listingId: null } as const);

      try {
        conversation = await prisma.conversation.create({
          data: {
            participant1Id: slots.participant1Id,
            participant2Id: slots.participant2Id,
            listingId: resolvedListingId,
          },
        });
        justCreatedConversation = true;
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
              participant1Id: slots.participant1Id,
              participant2Id: slots.participant2Id,
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

    const recentDuplicate = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        senderId: senderCanon,
        content: sanitizedContent,
        createdAt: { gte: new Date(Date.now() - MESSAGE_DEDUPE_MS) },
      },
      include: messagePostInclude,
      orderBy: { createdAt: "desc" },
    });

    const message = recentDuplicate
      ? recentDuplicate
      : await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: senderCanon,
            receiverId: effectiveReceiverId,
            content: sanitizedContent,
          },
          include: messagePostInclude,
        });

    console.log("[MSG-POST]", recentDuplicate ? "✓ Dedup reuse" : "✓ Created", message.id);

    if (!recentDuplicate) {
      void recordAnalyticsEvent({
        eventType: ANALYTICS_EVENT.message_sent,
        userId: senderCanon,
        listingId: conversation.listingId ?? undefined,
        metadata: {
          conversationId: conversation.id,
          messageId: message.id,
          receiverUserId: effectiveReceiverId,
        },
        request,
      });
    }

    if (!recentDuplicate) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      console.log("[MSG-POST] ✓ Conversation updated");
    }

    if (!recentDuplicate && justCreatedConversation) {
      void createAdminNotification({
        type: ADMIN_NOTIFICATION_TYPE.CONVERSATION_NEW,
        severity: AdminNotificationSeverity.info,
        title: "Conversație nouă",
        message: `Thread nou între utilizatori${resolvedListingId ? ` (anunț ${resolvedListingId})` : ""}.`,
        entityType: "conversation",
        entityId: conversation.id,
        metadata: {
          listingId: resolvedListingId,
          senderId: senderCanon,
          receiverId: effectiveReceiverId,
        },
      });
    }

    // Send email notification to recipient (async, don't wait)
    if (!recentDuplicate && receiver.email) {
      const senderName = message.sender.name || "Utilizator";
      sendMessageNotificationEmail(
        receiver.email,
        senderName,
        sanitizedContent
      ).catch((err: unknown) => console.error("Email notification error:", err));
    }

    const elapsed = Date.now() - startTime;
    console.log(`[MSG-POST] ✅ SUCCESS - Message ${message.id} sent in ${elapsed}ms`);

    if (!recentDuplicate) {
      console.log("[MSG-POST] sse-publish", {
        createdMessageId: message.id,
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        senderId: senderCanon,
        receiverId: effectiveReceiverId,
      });

      console.log("[MSG_DEBUG] SEND MESSAGE", {
        currentUserId: senderCanon,
        senderId: senderCanon,
        receiverId: effectiveReceiverId,
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
      });
    }

    if (!recentDuplicate) {
      publishToUsers([senderCanon, effectiveReceiverId], {
        type: "message",
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        senderId: senderCanon,
        receiverId: effectiveReceiverId,
        messageId: message.id,
      });
      messagingPublishSse([senderCanon, effectiveReceiverId], "conversation_update", {
        type: "conversation_update",
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        reason: "new_message",
        messagePreviewLen: sanitizedContent.length,
      });
      messagingPublishSse([effectiveReceiverId], "unread_update", {
        type: "unread_update",
        conversationId: conversation.id,
        listingId: conversation.listingId ?? null,
        reason: "new_message",
      });
    }

    promObserveHttpMessagePost(Date.now() - startTime);
    messagingStructuredLog("message_send", {
      requestId: corr.requestId,
      conversationId: conversation.id,
      messageId: message.id,
      userId: senderCanon,
      receiverId: effectiveReceiverId,
      duplicate: !!recentDuplicate,
      durationMs: Date.now() - startTime,
      contentLen: sanitizedContent.length,
    });

    return NextResponse.json({
      success: true,
      duplicate: !!recentDuplicate,
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
