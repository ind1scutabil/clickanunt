import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Test login — ClickAnunț");

export default function TestLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
