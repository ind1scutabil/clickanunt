# GA4 marketplace funnels

Consent-gated via existing cookie consent + `ConditionalAnalytics`.

Canonical events: `lib/seo/marketplace-ga4-events.ts`.

## Funnels (instrumentation targets)

1. Organic landing → search_submitted → listing_view → listing_contact_message / phone_reveal  
2. Homepage → publish_started → publish_step_completed → listing_submitted  
3. Detail → favorite_added → return → contact  
4. promotion_viewed → promotion_checkout_started → promotion_confirmed (webhook; no client PII)

## Privacy

Never send email, phone, name, message body, JWT, or raw userId as event params.
