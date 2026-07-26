/**
 * Re-exports shared API contracts only — do not define parallel JSON shapes here.
 * UI-only projections (inbox rows) are explicit and documented.
 */
import type {
  AuthTokensDto,
  ConversationListItemDto,
  ListingCreateBodyDto,
  ListingPatchBodyDto,
  OwnerAdminListingDto,
  PublicListingDto,
  MessageThreadRowDto,
  UserMeResponseDto,
  UserNotificationDto,
} from '@clickanunt/api-contracts';

export type AuthTokens = AuthTokensDto;

/** GET /api/users/me */
export type User = UserMeResponseDto;

/**
 * Catalog / anonymous detail → {@link PublicListingDto}.
 * My listings / mutations → {@link OwnerAdminListingDto}.
 */
export type Listing = PublicListingDto | OwnerAdminListingDto;

export type ListingPayload = ListingCreateBodyDto;

export type ListingUpdatePayload = ListingPatchBodyDto;

export function listingOwnerId(listing: Listing): string | undefined {
  if ('ownerUserId' in listing && typeof listing.ownerUserId === 'string') {
    return listing.ownerUserId;
  }
  return listing.owner?.id;
}

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

export type { ConversationListItemDto, PublicListingDto, OwnerAdminListingDto };
