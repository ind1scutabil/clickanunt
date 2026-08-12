/** Pending listing deep-link store — pure, no React Native deps. */

let pendingListingDeepLinkId: string | null = null;
let pendingListingDeepLinkUrl: string | null = null;

export function consumePendingListingDeepLink(): string | null {
  const id = pendingListingDeepLinkId;
  pendingListingDeepLinkId = null;
  pendingListingDeepLinkUrl = null;
  return id;
}

export function peekPendingListingDeepLink(): { id: string | null; url: string | null } {
  return { id: pendingListingDeepLinkId, url: pendingListingDeepLinkUrl };
}

export function storePendingListingDeepLink(url: string, listingId: string): void {
  pendingListingDeepLinkId = listingId;
  pendingListingDeepLinkUrl = url;
}

export function __setPendingListingDeepLinkForTests(
  listingId: string,
  url = `clickanunt://listings/${listingId}`
): void {
  storePendingListingDeepLink(url, listingId);
}
