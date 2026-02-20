import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messageSendSchema, uuidSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";

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
    const headerToken = request.headers.get("authorization")?.replace("Bearer ", "")?.trim();
    const cookieToken = request.cookies.get("accessToken")?.value;
    const candidateTokens = [headerToken, cookieToken].filter(
      (t): t is string => !!t && t !== "null" && t !== "undefined"
    );
    let payload = null;
    for (const candidate of candidateTokens) {
      payload = await verifyToken(candidate);
      if (payload) break;
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUserId = (payload as { userId?: string; sub?: string }).userId
      || (payload as { sub?: string }).sub;
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

    // Find exact conversation when conversationId is provided, otherwise scope by participant(+listing)
    const conversation = await prisma.conversation.findFirst({
      where: conversationIdParam
        ? {
            id: conversationIdParam,
            OR: [
              { participant1Id: currentUserId, participant2Id: otherUserId },
              { participant1Id: otherUserId, participant2Id: currentUserId },
            ],
          }
        : {
            OR: [
              { participant1Id: currentUserId, participant2Id: otherUserId },
              { participant1Id: otherUserId, participant2Id: currentUserId },
            ],
            ...(listingIdParam ? { listingId: listingIdParam } : {}),
          },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        participant1: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      // Return empty array if no conversation exists yet
      return NextResponse.json([]);
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

    return NextResponse.json(conversation.messages);
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

    const headerToken = request.headers.get("authorization")?.replace("Bearer ", "")?.trim();
    const cookieToken = request.cookies.get("accessToken")?.value;
    const candidateTokens = [headerToken, cookieToken].filter(
      (t): t is string => !!t && t !== "null" && t !== "undefined"
    );
    console.log('[MSG-POST] Token sources - header:', !!headerToken, 'cookie:', !!cookieToken);
    
    let payload = null;
    for (const candidate of candidateTokens) {
      payload = await verifyToken(candidate);
      if (payload) break;
    }

    if (!payload) {
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

    const senderId = (payload as { userId?: string; sub?: string }).userId
      || (payload as { sub?: string }).sub;
    if (!senderId) {
      console.log('[MSG-POST] ❌ Could not extract senderId from token');
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const receiverId = params.userId;
    console.log('[MSG-POST] Sender:', senderId, '-> Receiver:', receiverId);

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      console.log('[MSG-POST] ❌ Receiver not found:', receiverId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log('[MSG-POST] ✓ Receiver found:', receiver.email);

    // Find or create conversation (prefer explicit conversationId when provided)
    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { participant1Id: senderId, participant2Id: receiverId },
              { participant1Id: receiverId, participant2Id: senderId },
            ],
          },
        })
      : await prisma.conversation.findFirst({
          where: {
            OR: [
              { participant1Id: senderId, participant2Id: receiverId },
              { participant1Id: receiverId, participant2Id: senderId },
            ],
            ...(listingId ? { listingId } : { listingId: null }),
          },
        });

    if (conversationId && !conversation) {
      console.log('[MSG-POST] ❌ Conversation not found:', conversationId);
      return NextResponse.json(
        { error: "Conversation not found for selected thread" },
        { status: 409 }
      );
    }

    if (!conversation) {
      console.log('[MSG-POST] Creating new conversation...');
      const participant1Id = senderId < receiverId ? senderId : receiverId;
      const participant2Id = senderId < receiverId ? receiverId : senderId;

      conversation = await prisma.conversation.create({
        data: {
          participant1Id,
          participant2Id,
          listingId: listingId || null,
        },
      });
      console.log('[MSG-POST] ✓ Conversation created:', conversation.id);
    } else {
      console.log('[MSG-POST] ✓ Using existing conversation:', conversation.id);
    }

    // Create message
    console.log('[MSG-POST] Creating message...');
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    console.log('[MSG-POST] ✓ Message created:', message.id);

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
