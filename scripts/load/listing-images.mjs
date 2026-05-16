#!/usr/bin/env node
/**
 * Image-heavy profile: listing page HTML + first gallery image (read-only).
 */
import { resolveBaseUrl, assertLoadTestAllowed } from './lib/guard.mjs';
import { runLoadProfile, fetchGetMetrics, summarizeBytes } from './lib/metrics.mjs';

const listingId = process.env.LOAD_LISTING_ID?.trim();
if (!listingId) {
  console.error('ERROR: LOAD_LISTING_ID is required');
  process.exit(1);
}

const base = resolveBaseUrl();
assertLoadTestAllowed(base);

const pageUrl = new URL(`/listings/${listingId}`, base).href;
const pageRes = await fetch(pageUrl, { redirect: 'follow' });
const html = await pageRes.text();
const imgMatch =
  html.match(/src="(\/[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i) ||
  html.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i);
const imageUrl = imgMatch?.[1]
  ? imgMatch[1].startsWith('http')
    ? imgMatch[1]
    : new URL(imgMatch[1], base).href
  : null;

if (!imageUrl) {
  console.error('WARN: No image URL found in listing HTML; running page-only load');
}

const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
const durationSec = Number(process.env.LOAD_DURATION_SEC ?? 15);

const pageLoad = await runLoadProfile({
  name: 'listing-page-html',
  concurrency,
  durationSec,
  requestFn: () => fetchGetMetrics(pageUrl),
});

let imageLoad = null;
if (imageUrl) {
  imageLoad = await runLoadProfile({
    name: 'listing-first-image',
    concurrency,
    durationSec: Math.min(durationSec, 10),
    requestFn: () => fetchGetMetrics(imageUrl),
  });
}

console.log(
  JSON.stringify(
    {
      profile: 'listing-images',
      listingId,
      pageUrl,
      imageUrl,
      pageLoad,
      imageLoad,
      imageBytes: imageLoad?.responseBytes ?? null,
      sampledAt: new Date().toISOString(),
    },
    null,
    2
  )
);
