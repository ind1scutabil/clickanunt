import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Demo — ClickAnunț");

export default function UiDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
