import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica cookie — ClickAnunt",
  description: "Informații despre cookie-uri și preferințe pe ClickAnunt.",
};

export default function CookiesPolicyPage() {
  return (
    <LegalPageLayout title="Politica cookie" accentClassName="text-[#1E90FF]">
      <CompanyDetailsBox />
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">1. Ce sunt cookie-urile</h2>
        <p>
          Cookie-urile sunt fișiere mici stocate pe dispozitivul tău pentru a permite funcționarea platformei,
          a reține preferințele (inclusiv consimțământul pentru cookie-uri) și, doar cu acordul tău, pentru analiză
          sau marketing.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">2. Categorii</h2>
        <ul className="ml-4 list-inside list-disc space-y-2">
          <li>
            <strong className="text-white">Necesare</strong> — autentificare, securitate (CSRF), stocarea
            preferințelor de cookie; nu necesită consimțământ separat acolo unde legea le tratează ca strict
            necesare.
          </li>
          <li>
            <strong className="text-white">Analitice</strong> — ex. Google Analytics, Microsoft Clarity, doar dacă
            activezi categoria „Analitice” în bannerul de consimțământ.
          </li>
          <li>
            <strong className="text-white">Marketing</strong> — pixeli sau campanii de măsurare reclame; momentan nu
            încărcăm pixeli de marketing fără acord explicit.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">3. Gestionarea preferințelor</h2>
        <p>
          Poți modifica oricând alegerile din footer, la linkul „Setări cookie”, sau ștergând cheia din browser și
          revenind pe site (vei vedea din nou bannerul).
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">4. Contact</h2>
        <p>
          Pentru întrebări:{" "}
          <a href="mailto:dpo@clickanunt.ro" className="text-[#1E90FF] hover:underline">
            dpo@clickanunt.ro
          </a>{" "}
          sau{" "}
          <Link href="/contact" className="text-[#1E90FF] hover:underline">
            pagina de contact
          </Link>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
