/**
 * Re-exports shared API contracts only — do not define parallel JSON shapes here.
 * UI-only projections (inbox rows) are explicit and documented.
 */
import type {
  AuthTokensDto,
  ConversationListItemDto,
  ListingCreateBodyDto,
  ListingPatchBodyDto,
  ListingPublicDto,
  MessageThreadRowDto,
  UserMeResponseDto,
  UserNotificationDto,
} from '@clickanunt/api-contracts';

export type AuthTokens = AuthTokensDto;

/** GET /api/users/me */
export type User = UserMeResponseDto;

/** Listing JSON from GET/POST/PATCH /api/listings */
export type Listing = ListingPublicDto;

export type ListingPayload = ListingCreateBodyDto;

export type ListingUpdatePayload = ListingPatchBodyDto;

/**
 * Inbox row built in `api/client` from `ConversationListItemDto` (not raw API JSON).
 */
export type Conversation = {
  id: string;
  participantId?: string;
  participantName: string;
  participantAvatar?: string | null;
  listingId?: string;
  listingTitle?: string;
  lastMessage?: string | null;
  unreadCount?: number;
  updatedAt?: string;
};

export type MessageItem = Pick<
  MessageThreadRowDto,
  'id' | 'content' | 'senderId' | 'receiverId' | 'createdAt'
>;

export type NotificationItem = Pick<UserNotificationDto, 'id' | 'title' | 'message' | 'isRead' | 'createdAt'>;

export type { ConversationListItemDto };
