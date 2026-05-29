import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Soluționarea litigiilor (ODR) — ClickAnunt",
  description: "Platforma UE pentru soluționarea online a litigiilor de consum.",
  alternates: { canonical: "/litigii-ue" },
};

export default function EuOdrPage() {
  return (
    <LegalPageLayout title="Soluționarea litigiilor în UE (ODR)" accentClassName="text-[#1E90FF]" canonicalPath="/litigii-ue">
      <p>
        Comisia Europeană pune la dispoziție o platformă dedică soluționării online a litigiilor de consum (ODR).
        ClickAnunt poate fi utilizat de consumatori din UE; pentru litigii de consum legate de serviciile noastre
        digitale poți accesa platforma oficială:
      </p>
      <p className="pt-2">
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1E90FF] hover:underline"
        >
          https://ec.europa.eu/consumers/odr
        </a>
      </p>
      <p className="text-sm text-gray-400">
        Nu suntem obligați să participăm la proceduri ADR individuale, dar încurajăm soluționarea amiabilă și
        răspundem la solicitările legitime prin canalele de contact publicate.
      </p>
    </LegalPageLayout>
  );
}
