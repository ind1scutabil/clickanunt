import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";
import { LegalFaqSection } from "@/app/components/legal/LegalFaqSection";
import { ANTIFRAUD_FAQ } from "@/lib/seo/legal-faq";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica anti-fraudă — ClickAnunt",
  description: "Măsuri împotriva fraudei și a conținutului înșelător pe ClickAnunt.",
  alternates: { canonical: "/anti-frauda" },
};

export default function AntiFraudPolicyPage() {
  return (
    <LegalPageLayout title="Politica anti-fraudă" accentClassName="text-[#FF7900]" canonicalPath="/anti-frauda">
      <CompanyDetailsBox />
      <p>
        Protejăm utilizatorii prin verificări automate, moderare umană acolo unde e cazul, limite de rată și
        analiză de conținut. ClickAnunt nu este parte în tranzacțiile dintre utilizatori; totuși putem reacționa la
        raportări și la semnale de abuz.
      </p>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Ce facem</h2>
        <ul className="ml-4 list-inside list-disc space-y-2">
          <li>Analizăm raportările privind scam, produse interzise, drepturi de autor sau date personale expuse.</li>
          <li>Putem ascunde, edita sau șterge anunțuri care încalcă regulile sau legea.</li>
          <li>Putem suspenda temporar sau restricționa conturi implicate în comportament repetat riscant.</li>
          <li>Păstrăm jurnale tehnice și de moderare acolo unde legea și interesul legitim o permit.</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Raportează</h2>
        <p>
          Folosește butonul „Raportează anunțul” pe pagina anunțului (necesită cont autentificat conform regulilor
          actuale) sau{" "}
          <Link href="/contact" className="text-[#FF7900] hover:underline">
            contactează-ne
          </Link>{" "}
          la{" "}
          <a href="mailto:support@clickanunt.ro" className="text-[#FF7900] hover:underline">
            support@clickanunt.ro
          </a>
          .
        </p>
      </section>
      <LegalFaqSection items={ANTIFRAUD_FAQ} />
    </LegalPageLayout>
  );
}
