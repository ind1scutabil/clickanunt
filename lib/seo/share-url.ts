/**
 * Canonical share URL builder — www origin, optional UTM, no PII.
 */
import { siteOriginForSeoFeeds } from "@/lib/seo/site-url-guard";

export type ShareChannel = "native" | "whatsapp" | "facebook" | "copy";

export function buildListingShareUrl(input: {
  listingId: string;
  channel?: ShareChannel;
  campaign?: string;
}): string {
  const base = siteOriginForSeoFeeds();
  const url = new URL(`${base}/listings/${input.listingId}`);
  if (input.channel) {
    url.searchParams.set("utm_source", input.channel === "copy" ? "copy_link" : input.channel);
    url.searchParams.set("utm_medium", "share");
    url.searchParams.set("utm_campaign", input.campaign || "listing_share");
  }
  return url.toString();
}

export function buildWhatsAppShareHref(shareUrl: string, text?: string): string {
  const q = new URLSearchParams();
  q.set("text", text ? `${text} ${shareUrl}` : shareUrl);
  return `https://wa.me/?${q.toString()}`;
}

export function buildFacebookShareHref(shareUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}
