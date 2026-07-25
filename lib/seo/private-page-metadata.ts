import type { Metadata } from "next";

/** Server-side robots for authenticated / account / admin surfaces (HTML initial response). */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: PRIVATE_PAGE_ROBOTS,
  };
}
