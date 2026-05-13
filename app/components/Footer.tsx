import Link from "next/link";
import { FooterCookieSettingsLink } from "@/app/components/legal/FooterCookieSettingsLink";
import {
  COMPANY_CONFIG,
  isCompanyLegalDetailsPublic,
} from "@/lib/company-config";
import {
  CATEGORY_LABEL_BY_CANONICAL_SLUG,
  SEO_HIGHLIGHT_CITY_LABELS,
} from "@/lib/seo/market-paths";
import { slugifyRo } from "@/lib/seo/slug";

const FOOTER_SEO_CATEGORY_SLUGS = ["auto", "imobiliare", "electronice", "locuri-de-munca", "servicii", "agricultura"] as const;

function shortCatFromSlug(canonicalSlug: string): string {
  const lab = CATEGORY_LABEL_BY_CANONICAL_SLUG[canonicalSlug];
  return lab?.split(",")[0]?.trim() ?? canonicalSlug;
}

export default function Footer() {
  const showCompanyLegal = isCompanyLegalDetailsPublic();
  return (
    <footer className="mt-auto max-md:pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] border-t border-white/10 bg-neutral-950 text-neutral-400">
      <div className="border-b border-white/[0.06] bg-[#12151c]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-white/75">
            Cumpără cu cap: verifică produsul, evită plăți în avans către necunoscuți.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-white/50">
            <li>
              <Link href="/security" className="transition-colors hover:text-white">
                Siguranță
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition-colors hover:text-white">
                Raportează o problemă
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="mb-4 text-xl font-semibold tracking-tight text-white">
              ClickAnunt
            </h3>
            <p className="mb-4 text-sm text-neutral-500">
              Platforma ta de încredere pentru toate tipurile de anunțuri.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener" className="inline-block text-neutral-500 transition-colors duration-normal ease-premium hover:text-primary-400">
                <svg className="w-5 h-5 max-w-[20px] max-h-[20px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener" className="inline-block text-neutral-500 transition-colors duration-normal ease-premium hover:text-secondary-400">
                <svg className="w-5 h-5 max-w-[20px] max-h-[20px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-semibold text-neutral-100">Link-uri Rapide</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  Acasă
                </Link>
              </li>
              <li>
                <Link href="/listings" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  Anunțuri
                </Link>
              </li>
              <li>
                <Link href="/listings/new" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  Adaugă Anunț
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-semibold text-neutral-100">Informații Legale</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  📄 Termeni și Condiții
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  🔐 Politica de Confidențialitate (GDPR)
                </Link>
              </li>
              <li>
                <Link href="/gdpr" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  ⚖️ Drepturile GDPR
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  🍪 Politica cookie
                </Link>
              </li>
              <li>
                <Link href="/anunturi-interzise" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  ⛔ Anunțuri interzise
                </Link>
              </li>
              <li>
                <Link href="/anti-frauda" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  🛡️ Anti-fraudă
                </Link>
              </li>
              <li>
                <Link href="/rambursari" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  💶 Rambursări promovări
                </Link>
              </li>
              <li>
                <Link href="/notice-takedown" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  Copyright / Notice
                </Link>
              </li>
              <li>
                <Link href="/litigii-ue" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  🇪🇺 Soluționare litigii (ODR)
                </Link>
              </li>
              <li>
                <Link href="/security" className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  🔒 Securitate
                </Link>
              </li>
              <li>
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  🇪🇺 Platformă ODR (extern)
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-neutral-100">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={`mailto:${COMPANY_CONFIG.emails.admin}`} className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  🛡️ {COMPANY_CONFIG.emails.admin}
                </a>
              </li>
              <li>
                <a href={`mailto:${COMPANY_CONFIG.emails.support}`} className="transition-colors duration-normal ease-premium hover:text-secondary-400">
                  🆘 {COMPANY_CONFIG.emails.support}
                </a>
              </li>
              <li>
                <a href={`mailto:${COMPANY_CONFIG.emails.billing}`} className="transition-colors duration-normal ease-premium hover:text-warning-500">
                  💳 {COMPANY_CONFIG.emails.billing}
                </a>
              </li>
              <li>
                <a href={`mailto:${COMPANY_CONFIG.emails.contact}`} className="transition-colors duration-normal ease-premium hover:text-success-500">
                  📧 {COMPANY_CONFIG.emails.contact}
                </a>
              </li>
              <li>
                <a href="mailto:dpo@clickanunt.ro" className="transition-colors duration-normal ease-premium hover:text-info-500">
                  🔐 dpo@clickanunt.ro (GDPR)
                </a>
              </li>
              <li>
                <a href="tel:+40XXXXXXXXX" className="transition-colors duration-normal ease-premium hover:text-primary-400">
                  📱 +40 XXX XXX XXX
                </a>
              </li>
              <li className="text-xs text-neutral-600">
                Luni - Vineri: 09:00 - 18:00
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-neutral-950/80">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Anunțuri populare după categorie și oraș
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-8">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Categorii
              </h4>
              <ul className="flex flex-wrap gap-2">
                {FOOTER_SEO_CATEGORY_SLUGS.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}`}
                      className="inline-flex rounded-md border border-white/10 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:border-primary-400/40 hover:text-primary-50"
                    >
                      {shortCatFromSlug(slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Auto pe orașe
              </h4>
              <ul className="flex flex-wrap gap-2">
                {SEO_HIGHLIGHT_CITY_LABELS.slice(0, 12).map((city) => (
                  <li key={city}>
                    <Link
                      href={`/auto/${slugifyRo(city)}`}
                      className="inline-flex rounded-md border border-white/10 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:border-secondary-400/40 hover:text-secondary-50"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-neutral-500 md:flex-row">
            <div>
              <p>&copy; 2026 ClickAnunt. Toate drepturile rezervate.</p>
              {showCompanyLegal && (
                <p className="text-xs mt-1">
                  ENORE SALES TYPE S.R.L. | CUI: 46062613 | Reg. Com.: J20220000480181
                </p>
              )}
            </div>
            <div className="flex max-w-4xl flex-col items-center gap-3 text-sm text-neutral-500 md:max-w-none">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <Link href="/terms" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Termeni
                </Link>
                <Link href="/privacy" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Confidențialitate
                </Link>
                <Link href="/cookies" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Cookie
                </Link>
                <Link href="/gdpr" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  GDPR
                </Link>
                <Link href="/anunturi-interzise" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Interzise
                </Link>
                <Link href="/anti-frauda" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Anti-fraudă
                </Link>
                <Link href="/rambursari" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Rambursări
                </Link>
                <Link href="/notice-takedown" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Copyright
                </Link>
                <Link href="/contact" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Contact
                </Link>
                <Link href="/security" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  Siguranță
                </Link>
                <FooterCookieSettingsLink className="cursor-pointer border-0 bg-transparent p-0 text-inherit transition-colors duration-normal ease-premium hover:text-neutral-100" />
                <a href="https://www.dataprotection.ro" target="_blank" rel="noopener" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  ANSPDCP
                </a>
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener" className="transition-colors duration-normal ease-premium hover:text-neutral-100">
                  ODR UE
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Notice */}
      <div className="border-t border-white/10 bg-neutral-900/40">
        <div className="mx-auto max-w-7xl px-4 py-3 text-center text-xs text-neutral-500">
          <p>
            🔐 Respectăm confidențialitatea ta. Datele personale sunt prelucrate conform{" "}
            <Link href="/privacy" className="text-info-500 underline-offset-2 transition-colors hover:text-info-100 hover:underline">
              GDPR (Regulamentul UE 2016/679)
            </Link>{" "}
            și{" "}
            <Link href="/terms" className="text-primary-400 underline-offset-2 transition-colors hover:text-primary-200 hover:underline">
              Legii 190/2018
            </Link>
            . Pentru exercitarea drepturilor GDPR, contactați{" "}
            <a href="mailto:dpo@clickanunt.ro" className="text-secondary-500 underline-offset-2 transition-colors hover:text-secondary-300 hover:underline">
              dpo@clickanunt.ro
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
