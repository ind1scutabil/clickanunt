import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/conversations
 * Get all conversations for authenticated user with latest message preview
 */
export async function GET(request: NextRequest) {
  try {
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

    const userId = (payload as { userId?: string; sub?: string }).userId
      || (payload as { sub?: string }).sub;
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }
    
    const fs = require('fs');
    const logPath = '/tmp/conversations-debug.log';
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] userId: ${userId}\n`);

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
        participant2: {
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
          select: {
            id: true,
            content: true,
            isRead: true,
            receiverId: true,
            senderId: true,
            createdAt: true,
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
        ? conv.participant2 
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
    
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Returning ${formattedConversations.length} conversations\n`);
    fs.appendFileSync(logPath, JSON.stringify(formattedConversations, null, 2) + '\n');
    
    return NextResponse.json(formattedConversations);
  } catch (error: unknown) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

