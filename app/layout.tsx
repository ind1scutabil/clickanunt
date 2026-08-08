import type { Metadata, Viewport } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import { ConditionalAnalytics } from "./components/analytics/ConditionalAnalytics";
import { CookieConsentProvider } from "./components/legal/cookie-consent-context";
import { GlobalJsonLd } from "./components/seo/GlobalJsonLd";
import { getFooterIndexableLinks } from "@/lib/seo/footer-indexable-links";
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
  icons: {
    icon: [
      {
        url: "/brand/clickanunt-favicon-96.png",
        type: "image/png",
        sizes: "96x96",
      },
      {
        url: "/favicon.ico",
        type: "image/x-icon",
        sizes: "48x48",
      },
      {
        url: "/brand/clickanunt-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/brand/clickanunt-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/brand/apple-touch-icon-180.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  warnIfProductionSiteUrlMissing();

  let categoryLinks: Awaited<ReturnType<typeof getFooterIndexableLinks>>["categories"] = [];
  let cityHubLinks: Awaited<ReturnType<typeof getFooterIndexableLinks>>["cityHubs"] = [];
  try {
    const footerLinks = await getFooterIndexableLinks();
    categoryLinks = footerLinks.categories;
    cityHubLinks = footerLinks.cityHubs;
  } catch {
    // Hide hub blocks on fetch failure rather than linking empty hubs.
  }

  return (
    <html lang="ro">
      <body className="antialiased flex min-h-screen flex-col bg-[var(--bg-primary)] font-sans text-[var(--text-primary)]">
        <CookieConsentProvider>
          {/* Analytics: only after explicit analytics consent (ConditionalAnalytics). */}
          <ConditionalAnalytics />
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
          <Footer categoryLinks={categoryLinks} cityHubLinks={cityHubLinks} />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
