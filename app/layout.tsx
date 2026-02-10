import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "ClickAnunț - Platforma de anunțuri gratuite din România",
  description: "Cumpără și vinde orice în România. Peste 50.000 de anunțuri verificate pentru auto, imobiliare, electronice, modă și multe altele. Publicare gratuită pe www.clickanunt.ro",
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
    description: 'Cumpără și vinde orice în România. Peste 50.000 de anunțuri verificate. Publicare gratuită.',
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
    description: 'Cumpără și vinde orice în România. Peste 50.000 de anunțuri verificate.',
    images: ['/images/og-home.jpg'],
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body
        className="antialiased flex flex-col min-h-screen"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <div id="main-content" className="flex-grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
