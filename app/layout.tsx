import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "ClickAnunț - Platforma de anunțuri gratuite din România",
  description:
    "Cumpără și vinde în România — auto, imobiliare, electronice, modă și multe altele. Anunțuri verificate, publicare gratuită pe www.clickanunt.ro",
  keywords: ["anunțuri gratuite", "anunțuri România", "vânzare", "cumpărare", "auto", "imobiliare", "electronice", "modă", "clickanunt"],
  authors: [{ name: "ClickAnunț" }],
  creator: "ClickAnunț",
  publisher: "ClickAnunț",
  robots: "index, follow",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clickanunt.ro'),
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
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="antialiased flex min-h-screen flex-col bg-[var(--bg-primary)] font-sans text-[var(--text-primary)]">
        <div id="main-content" className="flex-grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
