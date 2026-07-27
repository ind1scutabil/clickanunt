/**
 * Server policy for listing-scoped marketplace conversations.
 * Seller is always derived from Listing.ownerUserId — never from client recipient spoof.
 */
import {
  isListingPromotionEligible,
  type ListingLifecycleShape,
} from "@/lib/listing-lifecycle";
import { canonicalMessagingUserId, messagingUserIdsEqual } from "@/lib/messaging-user-id";

export type ListingContactRow = ListingLifecycleShape & {
  id: string;
  ownerUserId: string;
  title?: string | null;
};

export type ListingContactDecision =
  | {
      ok: true;
      ownerUserId: string;
      contactableForNew: boolean;
    }
  | { ok: false; status: 400 | 403 | 404; error: string };

/** True when a listing may start a *new* buyer→seller conversation (same core as public browse). */
export function isListingContactableForNewConversation(
  listing: ListingLifecycleShape,
  now: Date = new Date()
): boolean {
  return isListingPromotionEligible(listing, now);
}

/**
 * Resolve seller for a listing-scoped send and validate path peer + self-contact.
 * `pathPeerUserId` is the URL `[userId]` — must match listing owner when starting/using listing threads.
 */
export function resolveListingConversationPeer(params: {
  listing: ListingContactRow;
  senderId: string;
  pathPeerUserId: string;
  now?: Date;
}): ListingContactDecision {
  const ownerCanon =
    canonicalMessagingUserId(params.listing.ownerUserId) ??
    String(params.listing.ownerUserId).trim().toLowerCase();
  const senderCanon =
    canonicalMessagingUserId(params.senderId) ??
    String(params.senderId).trim().toLowerCase();
  const pathCanon =
    canonicalMessagingUserId(params.pathPeerUserId) ??
    String(params.pathPeerUserId).trim().toLowerCase();

  if (!ownerCanon) {
    return { ok: false, status: 404, error: "Anunțul nu are vânzător valid" };
  }

  if (!messagingUserIdsEqual(pathCanon, ownerCanon)) {
    return {
      ok: false,
      status: 403,
      error: "Destinatarul trebuie să fie proprietarul anunțului",
    };
  }

  if (messagingUserIdsEqual(senderCanon, ownerCanon)) {
    return {
      ok: false,
      status: 400,
      error: "Nu poți începe o conversație pe propriul anunț",
    };
  }

  return {
    ok: true,
    ownerUserId: ownerCanon,
    contactableForNew: isListingContactableForNewConversation(
      params.listing,
      params.now
    ),
  };
}

/** Public-safe label for inbox / thread when listing is no longer browseable. */
export function listingUnavailableLabel(listing: {
  status?: string | null;
  deletedAt?: Date | string | null;
  expiresAt?: Date | string | null;
} | null): string | null {
  if (!listing) return "Anunț indisponibil";
  if (listing.deletedAt != null && listing.deletedAt !== "") {
    return "Anunț indisponibil";
  }
  const status = String(listing.status ?? "").toLowerCase();
  if (
    status &&
    status !== "active" &&
    ["paused", "expired", "sold", "deleted", "rejected", "hidden", "pending", "draft"].includes(
      status
    )
  ) {
    return "Anunț indisponibil";
  }
  if (
    listing.expiresAt != null &&
    listing.expiresAt !== "" &&
    new Date(listing.expiresAt).getTime() < Date.now()
  ) {
    return "Anunț indisponibil";
  }
  return null;
}
