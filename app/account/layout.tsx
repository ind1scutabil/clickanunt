import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Cont — ClickAnunț");

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
