import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Publică anunț — ClickAnunț");

/**
 * Hide public mobile bottom nav before paint (matches MobileBottomNav contract)
 * to avoid footer/#main-content padding CLS on /listings/new.
 */
export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.hideMobileBottomNav="1";`,
        }}
      />
      {children}
    </>
  );
}
