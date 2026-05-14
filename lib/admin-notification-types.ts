/**
 * Canonical admin notification `type` values (string column).
 * UI filters map to these prefixes / exact keys.
 */
export const ADMIN_NOTIFICATION_TYPE = {
  USER_REGISTERED: "user.registered",
  LISTING_CREATED: "listing.created",
  LISTING_PENDING_MODERATION: "listing.pending_moderation",
  REPORT_CREATED: "report.created",
  REPORT_THRESHOLD: "report.threshold",
  PAYMENT_SUCCEEDED: "payment.succeeded",
  PAYMENT_FAILED: "payment.failed",
  PROMOTION_ACTIVATED: "promotion.activated",
  PROMOTION_EXPIRED_BATCH: "promotion.expired_batch",
  CONVERSATION_NEW: "message.conversation_new",
  MESSAGE_NEW: "message.new",
  USER_BANNED: "user.banned",
  USER_SUSPENDED: "user.suspended",
  AUDIT_IMPORTANT: "audit.important",
  RULE_VOLUME_DROP: "rule.volume_drop_listing_views",
  RULE_RAPID_LISTINGS: "rule.rapid_listings",
  RULE_MULTI_ACCOUNT_IP: "rule.multi_account_ip",
  RULE_ORPHAN_ANALYTICS: "rule.orphan_analytics_events",
  RULE_ACTIVE_NO_PHOTOS: "rule.active_listing_no_photos",
  RULE_MESSAGING_ERRORS: "rule.messaging_system_errors",
} as const;

export type AdminNotificationType =
  (typeof ADMIN_NOTIFICATION_TYPE)[keyof typeof ADMIN_NOTIFICATION_TYPE];
