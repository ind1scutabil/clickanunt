import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";
import { LegalFaqSection } from "@/app/components/legal/LegalFaqSection";
import { GDPR_FAQ } from "@/lib/seo/legal-faq";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Drepturile GDPR — ClickAnunt",
  description: "Cum îți exerciți drepturile privind datele personale pe ClickAnunt.",
  alternates: { canonical: "/gdpr" },
};

export default function GdprRightsPage() {
  return (
    <LegalPageLayout title="Drepturile tale GDPR" accentClassName="text-[#1E90FF]" canonicalPath="/gdpr">
      <CompanyDetailsBox />
      <p>
        ClickAnunt prelucrează date personale în calitate de operator, conform Regulamentului (UE) 2016/679 (GDPR) și
        legislației române. Mai jos găsești canalele practice pentru solicitări.
      </p>
      <section className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-4">
        <h2 className="mb-2 text-xl font-semibold text-white">Cel mai rapid canal</h2>
        <p className="text-sm">
          Trimite cererea de pe <strong className="text-white">adresa de email asociată contului</strong> către{" "}
          <a href="mailto:dpo@clickanunt.ro" className="text-[#1E90FF] hover:underline">
            dpo@clickanunt.ro
          </a>
          . Menționează tipul de solicitare (acces, rectificare, ștergere, portabilitate, opoziție, restricționare).
          Răspundem în termen de până la 30 de zile calendaristice, conform art. 12 GDPR.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Formular / contact</h2>
        <p>
          Poți folosi și{" "}
          <Link href="/contact" className="text-[#1E90FF] hover:underline">
            pagina de contact
          </Link>{" "}
          cu subiect dedicat GDPR; mesajul se trimite prin clientul tău de email (fără stocare automată pe server
          dacă nu există infrastructură de ticketing).
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Plângere la autoritate</h2>
        <p className="text-sm">
          ANSPDCP —{" "}
          <a href="https://www.dataprotection.ro" className="text-[#1E90FF] hover:underline" rel="noopener" target="_blank">
            www.dataprotection.ro
          </a>
        </p>
      </section>
      <LegalFaqSection items={GDPR_FAQ} />
    </LegalPageLayout>
  );
}
