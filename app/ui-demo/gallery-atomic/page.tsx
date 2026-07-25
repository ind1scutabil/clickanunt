import { notFound } from "next/navigation";
import { isGalleryAtomicFixtureEnabled } from "@/lib/gallery-atomic-fixture-guard";
import { GalleryAtomicClient } from "./GalleryAtomicClient";

/**
 * Dev/test-only Playwright fixture. Production always 404s.
 * No DB queries, no real listing IDs, no analytics side effects.
 */
export default function GalleryAtomicDemoPage() {
  if (!isGalleryAtomicFixtureEnabled()) {
    notFound();
  }
  return <GalleryAtomicClient />;
}
