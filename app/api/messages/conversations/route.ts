import { NextRequest, NextResponse } from "next/server";
import { getMessagingApiAuthPayload } from "@/lib/messages-request-auth";
import { prisma } from "@/lib/prisma";
import { canonicalMessagingUserId, messagingUserIdsEqual } from "@/lib/messaging-user-id";

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

    const userCanon =
      canonicalMessagingUserId(userId) ?? userId.trim().toLowerCase();

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userCanon },
          { participant2Id: userCanon },
        ],
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
                receiverId: userCanon,
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const formattedConversations = conversations.map((conv) => {
      const viewerIsP1 = messagingUserIdsEqual(conv.participant1Id, userCanon);
      const viewerIsP2 = messagingUserIdsEqual(conv.participant2Id, userCanon);
      const otherParticipant =
        viewerIsP1 ? conv.participant2 : viewerIsP2 ? conv.participant1 : conv.participant2;

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

    const unreadSum = formattedConversations.reduce((a, c) => a + c.unreadCount, 0);
    console.log("[api/messages/conversations]", {
      userId: userCanon,
      conversationsCount: formattedConversations.length,
      unreadAcrossThreads: unreadSum,
    });
    console.log("[MSG_DEBUG] FETCH CONVERSATIONS", {
      currentUserId: userCanon,
      conversationCount: conversations.length,
      conversationIds: conversations.map((c) => c.id),
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

