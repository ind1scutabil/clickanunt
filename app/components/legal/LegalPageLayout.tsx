import Link from "next/link";
import type { ReactNode } from "react";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld";

export function LegalPageLayout({
  title,
  accentClassName = "text-[#FF7900]",
  canonicalPath,
  children,
}: {
  title: string;
  accentClassName?: string;
  /** Site-relative path (e.g. "/gdpr"); enables BreadcrumbList JSON-LD that matches the visible trail. */
  canonicalPath?: string;
  children: ReactNode;
}) {
  const breadcrumbJsonLd = canonicalPath
    ? buildBreadcrumbJsonLd([
        { name: "Acasă", url: "/" },
        { name: title, url: canonicalPath },
      ])
    : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      ) : null}
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="text-[#FF7900] hover:underline">
                Acasă
              </Link>
            </li>
            <li aria-hidden className="text-gray-600">
              ›
            </li>
            <li className="text-gray-300">{title}</li>
          </ol>
        </nav>
        <h1 className={`mb-8 text-4xl font-bold ${accentClassName}`}>{title}</h1>
        <div className="space-y-8 text-gray-300">{children}</div>
      </div>
    </div>
  );
}
