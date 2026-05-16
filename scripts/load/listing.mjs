#!/usr/bin/env node
import { executeProfile } from './lib/profile-runner.mjs';

const listingId = process.env.LOAD_LISTING_ID?.trim();
if (!listingId) {
  console.error('ERROR: LOAD_LISTING_ID is required');
  process.exit(1);
}

await executeProfile(
  'listing-detail',
  (base) => new URL(`/listings/${listingId}`, base).href,
  { concurrency: 15 }
);
