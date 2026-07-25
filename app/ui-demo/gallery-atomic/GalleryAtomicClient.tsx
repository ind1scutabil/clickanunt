"use client";

import { ListingPhotoGallery } from "@/app/components/listing/ListingPhotoGallery";

/**
 * Synthetic fixture photos only — no DB, no real listings, no production listing assets,
 * and not a listing detail page (so no view counters / analytics side effects).
 */
const FIXTURE_PHOTOS = Array.from({ length: 8 }, (_, i) => {
  return `/listings/gallery-atomic-fixture/original/photo-${i}.jpg`;
});

export function GalleryAtomicClient() {
  return (
    <main className="listing-detail-page mx-auto max-w-5xl px-0 py-6 md:px-4">
      <h1 className="mb-4 px-4 text-lg font-semibold text-zinc-100 md:px-0">
        Gallery atomic fixture
      </h1>
      <ListingPhotoGallery
        photos={FIXTURE_PHOTOS}
        title="Atomic fixture listing"
      />
    </main>
  );
}
