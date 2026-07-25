import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Promovează anunț — ClickAnunț");

export default function PromoteListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
