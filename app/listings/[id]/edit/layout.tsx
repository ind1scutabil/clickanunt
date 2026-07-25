import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Editează anunț — ClickAnunț");

export default function EditListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
