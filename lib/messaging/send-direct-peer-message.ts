/**
 * Creează sau folosește un thread 1:1 și trimite un mesaj (fără listing).
 * Folosit de admin direct message; aliniat cu POST /api/messages/[userId].
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canonicalMessagingUserId } from "@/lib/messaging-user-id";
import { conversationParticipantSlots } from "@/lib/messaging-conversation-participants";
import { normalizeMessagingContent } from "@/lib/messaging-content";
import { messagingPublishSse, publishToUsers } from "@/lib/messaging-sse-hub";

const MESSAGE_DEDUPE_MS = 60_000;

export type SendDirectPeerMessageResult = {
  conversationId: string;
  messageId: string;
  duplicate: boolean;
};

export class SendDirectPeerMessageError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "SendDirectPeerMessageError";
  }
}

export async function sendDirectPeerMessage(params: {
  senderId: string;
  receiverId: string;
  content: string;
}): Promise<SendDirectPeerMessageResult> {
  const sanitizedContent = normalizeMessagingContent(params.content);
  if (sanitizedContent.length === 0) {
    throw new SendDirectPeerMessageError("Mesajul este obligatoriu", 400);
  }
  if (sanitizedContent.length > 5000) {
    throw new SendDirectPeerMessageError("Mesajul este prea lung", 400);
  }

  const senderCanon =
    canonicalMessagingUserId(params.senderId) ??
    String(params.senderId).trim().toLowerCase();
  const receiverCanon =
    canonicalMessagingUserId(params.receiverId) ??
    String(params.receiverId).trim().toLowerCase();

  if (senderCanon === receiverCanon) {
    throw new SendDirectPeerMessageError(
      "Nu poți trimite mesaj către propriul cont",
      400
    );
  }

  const [senderProfile, receiver] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderCanon },
      select: { isBanned: true, deletedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: receiverCanon },
      select: {
        id: true,
        email: true,
        isBanned: true,
        deletedAt: true,
      },
    }),
  ]);

  if (!senderProfile || senderProfile.deletedAt || senderProfile.isBanned) {
    throw new SendDirectPeerMessageError(
      "Contul expeditorului nu poate trimite mesaje",
      403
    );
  }

  if (!receiver) {
    throw new SendDirectPeerMessageError("Utilizatorul nu există", 404);
  }

  if (receiver.deletedAt || receiver.isBanned) {
    throw new SendDirectPeerMessageError(
      "Destinatarul nu poate primi mesaje",
      403
    );
  }

  const slots = conversationParticipantSlots(senderCanon, receiverCanon);
  let conversation = await prisma.conversation.findFirst({
    where: {
      participant1Id: slots.participant1Id,
      participant2Id: slots.participant2Id,
      listingId: null,
    },
  });

  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: slots.participant1Id,
          participant2Id: slots.participant2Id,
          listingId: null,
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        conversation = await prisma.conversation.findFirst({
          where: {
            participant1Id: slots.participant1Id,
            participant2Id: slots.participant2Id,
            listingId: null,
          },
        });
        if (!conversation) throw e;
      } else {
        throw e;
      }
    }
  }

  const recentDuplicate = await prisma.message.findFirst({
    where: {
      conversationId: conversation.id,
      senderId: senderCanon,
      content: sanitizedContent,
      createdAt: { gte: new Date(Date.now() - MESSAGE_DEDUPE_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  const message =
    recentDuplicate ??
    (await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: senderCanon,
        receiverId: receiverCanon,
        content: sanitizedContent,
      },
    }));

  const duplicate = Boolean(recentDuplicate);

  if (!duplicate) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    publishToUsers([senderCanon, receiverCanon], {
      type: "message",
      conversationId: conversation.id,
      listingId: null,
      senderId: senderCanon,
      receiverId: receiverCanon,
      messageId: message.id,
    });
    messagingPublishSse([senderCanon, receiverCanon], "conversation_update", {
      type: "conversation_update",
      conversationId: conversation.id,
      listingId: null,
      reason: "new_message",
      messagePreviewLen: sanitizedContent.length,
    });
    messagingPublishSse([receiverCanon], "unread_update", {
      type: "unread_update",
      conversationId: conversation.id,
      listingId: null,
      reason: "new_message",
    });
  }

  return {
    conversationId: conversation.id,
    messageId: message.id,
    duplicate,
  };
}
