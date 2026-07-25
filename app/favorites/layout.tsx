import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Favorite — ClickAnunț");

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
