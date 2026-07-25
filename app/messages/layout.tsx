import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Mesaje — ClickAnunț");

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
