import { NextRequest, NextResponse } from "next/server";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/conversations
 * Get all conversations for authenticated user with latest message preview
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getMessagingApiAuthPayload(request);

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = payload.userId || (payload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }
    
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: {
          select: { id: true, name: true, avatar: true, email: true, role: true },
        },
        participant2: {
          select: { id: true, name: true, avatar: true, email: true, role: true },
        },
        listing: {
          select: { id: true, title: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            isRead: true,
            receiverId: true,
            senderId: true,
            createdAt: true,
            sender: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receiverId: userId,
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const formattedConversations = conversations.map((conv) => {
      const otherParticipant =
        conv.participant1Id === userId ? conv.participant1 : conv.participant2;

      return {
        id: conv.id,
        otherParticipant,
        listing: conv.listing,
        lastMessage: conv.messages[0] || null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv._count.messages,
        createdAt: conv.createdAt,
      };
    });

    return NextResponse.json(formattedConversations, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: unknown) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

