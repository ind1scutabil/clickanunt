import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Publică anunț — ClickAnunț");

/**
 * Hide public mobile bottom nav before paint.
 * `data-publish-flow` enables CSS :has() padding (no JS race with footer mt-auto CLS).
 * dataset script kept for MobileBottomNav / existing contracts.
 */
export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-publish-flow="1">
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.hideMobileBottomNav="1";`,
        }}
      />
      {children}
    </div>
  );
}
