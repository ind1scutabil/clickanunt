import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { messageSendSchema, uuidSchema } from "@/lib/security/validation-schemas";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/[userId]
 * Get messages with specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const idCheck = uuidSchema.safeParse(params.userId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const currentUserId = payload.userId;
    const otherUserId = params.userId;

    // Find or create conversation between these two users
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: currentUserId, participant2Id: otherUserId },
          { participant1Id: otherUserId, participant2Id: currentUserId },
        ],
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
  { params }: { params: { userId: string } }
) {
  try {
    const idCheck = uuidSchema.safeParse(params.userId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'messages',
      schema: messageSendSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { content, listingId } = security.data as { content: string; listingId?: string };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const senderId = payload.userId;
    const receiverId = params.userId;

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: senderId, participant2Id: receiverId },
          { participant1Id: receiverId, participant2Id: senderId },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: senderId,
          participant2Id: receiverId,
          listingId: listingId || null,
        },
      });
    }

    // Create message
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

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
