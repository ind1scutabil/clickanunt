import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Publică anunț — ClickAnunț");

export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
