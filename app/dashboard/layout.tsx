import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata: Metadata = privatePageMetadata("Dashboard — ClickAnunț");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
