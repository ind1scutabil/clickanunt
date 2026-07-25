import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Demo catalog — ClickAnunț");

export default function CarCatalogDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
