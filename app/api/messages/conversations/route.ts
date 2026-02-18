import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/conversations
 * Get all conversations for authenticated user with latest message preview
 */
export async function GET(request: NextRequest) {
  try {
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

    const userId = payload.userId;

    // Get all conversations for this user
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            businessName: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            photos: true,
            priceAmount: true,
            priceCurrency: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Format conversations with the other participant's info
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participant1Id === userId 
        ? conv.participant1 
        : conv.participant1;
      
      const unreadCount = conv.messages.filter(
        (msg) => msg.receiverId === userId && !msg.isRead
      ).length;

      return {
        id: conv.id,
        otherParticipant,
        listing: conv.listing,
        lastMessage: conv.messages[0] || null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt,
      };
    });

    return NextResponse.json(formattedConversations);
  } catch (error: unknown) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

