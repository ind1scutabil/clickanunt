import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Editează anunț — ClickAnunț");

/** Hide mobile bottom nav before paint — same contract as /listings/new. */
export default function EditListingLayout({ children }: { children: React.ReactNode }) {
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
