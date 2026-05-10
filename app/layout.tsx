import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import { GlobalJsonLd } from "./components/seo/GlobalJsonLd";
import { warnIfProductionSiteUrlMissing } from "@/lib/seo/site-url-guard";
import { siteOrigin } from "@/lib/site-url";

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
  robots: "index, follow",
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
        url: '/images/og-home.jpg',
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
    images: ['/images/og-home.jpg'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  warnIfProductionSiteUrlMissing();

  return (
    <html lang="ro">
      <body className="antialiased flex min-h-screen flex-col bg-[var(--bg-primary)] font-sans text-[var(--text-primary)]">
        <GlobalJsonLd />
        <div id="main-content" className="flex-grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
