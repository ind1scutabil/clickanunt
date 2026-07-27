/** @jest-environment node */
import {
  isListingContactableForNewConversation,
  listingUnavailableLabel,
  resolveListingConversationPeer,
} from "@/lib/messaging/listing-contact";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const buyerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const spoofId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("listing-contact policy", () => {
  const activeListing = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    ownerUserId: ownerId,
    status: "active",
    moderationStatus: "approved",
    deletedAt: null,
    expiresAt: null,
  };

  it("allows new conversation on active approved listing to owner", () => {
    const d = resolveListingConversationPeer({
      listing: activeListing,
      senderId: buyerId,
      pathPeerUserId: ownerId,
    });
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.ownerUserId).toBe(ownerId);
      expect(d.contactableForNew).toBe(true);
    }
  });

  it("rejects recipient spoof (path peer ≠ listing owner)", () => {
    const d = resolveListingConversationPeer({
      listing: activeListing,
      senderId: buyerId,
      pathPeerUserId: spoofId,
    });
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.status).toBe(403);
      expect(d.error).toMatch(/proprietar/i);
    }
  });

  it("rejects self-conversation on own listing", () => {
    const d = resolveListingConversationPeer({
      listing: activeListing,
      senderId: ownerId,
      pathPeerUserId: ownerId,
    });
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.status).toBe(400);
      expect(d.error).toMatch(/propriul anunț/i);
    }
  });

  it("marks paused listing not contactable for new threads", () => {
    expect(
      isListingContactableForNewConversation({
        ...activeListing,
        status: "paused",
      })
    ).toBe(false);
  });

  it("marks soft-deleted listing not contactable", () => {
    expect(
      isListingContactableForNewConversation({
        ...activeListing,
        deletedAt: new Date(),
      })
    ).toBe(false);
  });

  it("labels unavailable listings for inbox UX", () => {
    expect(listingUnavailableLabel({ status: "paused", deletedAt: null })).toBe(
      "Anunț indisponibil"
    );
    expect(
      listingUnavailableLabel({
        status: "active",
        deletedAt: null,
        expiresAt: null,
      })
    ).toBeNull();
    expect(listingUnavailableLabel(null)).toBe("Anunț indisponibil");
  });
});
