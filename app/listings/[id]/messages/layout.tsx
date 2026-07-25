import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Mesaje anunț — ClickAnunț");

export default function ListingMessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
