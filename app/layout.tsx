import type { Metadata, Viewport } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import { GoogleAnalytics } from "./components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "./components/analytics/MicrosoftClarity";
import { GlobalJsonLd } from "./components/seo/GlobalJsonLd";
import { warnIfProductionSiteUrlMissing } from "@/lib/seo/site-url-guard";
import { siteOrigin } from "@/lib/site-url";
import { stagingRobotsMetadata } from "@/lib/staging/site-mode";

const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  title: "ClickAnunț - Platforma de anunțuri gratuite din România",
  description:
    "Cumpără și vinde în România — auto, imobiliare, electronice, modă și multe altele. Anunțuri verificate, publicare gratuită pe www.clickanunt.ro",
  keywords: ["anunțuri gratuite", "anunțuri România", "vânzare", "cumpărare", "auto", "imobiliare", "electronice", "modă", "clickanunt"],
  authors: [{ name: "ClickAnunț" }],
  creator: "ClickAnunț",
  publisher: "ClickAnunț",
  robots: stagingRobotsMetadata(),
  metadataBase: new URL(siteOrigin()),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: '/',
    siteName: 'ClickAnunț',
    title: 'ClickAnunț - Platforma de anunțuri gratuite din România',
    description: 'Cumpără și vinde în România. Anunțuri verificate, publicare gratuită.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ClickAnunț - Anunțuri gratuite în România',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@clickanunt',
    creator: '@clickanunt',
    title: 'ClickAnunț - Platforma de anunțuri gratuite din România',
    description: 'Cumpără și vinde în România. Anunțuri verificate.',
    images: ['/opengraph-image'],
  },
  ...(googleVerification ||
  process.env.NEXT_PUBLIC_YANDEX_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
            ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
};

/** iOS Safari: env(safe-area-inset-*) needs viewport-fit=cover for notch / home indicator. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  warnIfProductionSiteUrlMissing();

  return (
    <html lang="ro">
      <body className="antialiased flex min-h-screen flex-col bg-[var(--bg-primary)] font-sans text-[var(--text-primary)]">
        {/* Analytics: production + env only — see GROWTH_SEO_IMPLEMENTATION_REPORT.md */}
        <GoogleAnalytics />
        <MicrosoftClarity />
        <GlobalJsonLd />
        {/* Skip link must live in the server layout — not inside client Navbar — so SSR and hydration always match */}
        <a href="#main-content" className="skip-to-content-link">
          Salt la conținut principal
        </a>
        <div
          id="main-content"
          className="flex-grow pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        >
          {children}
        </div>
        <MobileBottomNav />
        <Footer />
      </body>
    </html>
  );
}
