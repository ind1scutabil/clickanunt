import type { IsoDateTimeString } from './common';

export type MessageParticipantDto = {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  role: string;
};

export type ConversationListItemDto = {
  id: string;
  otherParticipant: MessageParticipantDto;
  listing: { id: string; title: string } | null;
  lastMessage: {
    id: string;
    content: string;
    isRead: boolean;
    receiverId: string;
    senderId: string;
    createdAt: IsoDateTimeString;
    sender?: MessageParticipantDto;
  } | null;
  lastMessageAt: IsoDateTimeString | null;
  unreadCount: number;
  createdAt: IsoDateTimeString;
};

/**
 * GET /api/messages/conversations — JSON array of `ConversationListItemDto`.
 */
export type ConversationsListResponseDto = ConversationListItemDto[];

/**
 * GET /api/messages/:userId — obiect `{ conversationId, listingId, messages }` (nu array brut).
 */
export type MessageThreadEnvelopeDto = {
  conversationId: string | null;
  listingId: string | null;
  messages: MessageThreadRowDto[];
};

/**
 * Linie mesaj în fir (include sender/receiver dacă API le returnează).
 */
export type MessageThreadRowDto = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: IsoDateTimeString;
  readAt?: IsoDateTimeString | null;
  sender?: MessageParticipantDto;
  receiver?: MessageParticipantDto;
};

/** @deprecated folosiți `MessageThreadEnvelopeDto`; păstrat pentru compat */
export type MessageThreadResponseDto = MessageThreadRowDto[];
