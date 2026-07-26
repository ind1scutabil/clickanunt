import type { Metadata } from "next";
import SignupPage from "../signup/page";

/** Segment config must be declared in this file (Next.js 16 / Turbopack — no reexport from other routes). */
export const metadata: Metadata = {
  title: "Creează cont — ClickAnunț",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default SignupPage;
