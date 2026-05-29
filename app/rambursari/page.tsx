import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";
import { LegalFaqSection } from "@/app/components/legal/LegalFaqSection";
import { REFUND_FAQ } from "@/lib/seo/legal-faq";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rambursări promovări — ClickAnunt",
  description: "Politica de rambursare pentru serviciile digitale de promovare pe ClickAnunt.",
  alternates: { canonical: "/rambursari" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Politica de rambursare (promovări plătite)" accentClassName="text-[#FF7900]" canonicalPath="/rambursari">
      <CompanyDetailsBox />
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">1. Ce cumperi</h2>
        <p>
          Promovările sunt <strong className="text-white">servicii digitale</strong> (vizibilitate sporită în
          platformă — evidențiere, top, bannere etc., conform pachetului ales). Plata se procesează online; livrarea
          începe după confirmarea plății și activarea pachetului în sistem.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">2. Când începe serviciul</h2>
        <p>
          Durata și tipul promovării sunt afișate înainte de plată. După activare, serviciul curge pe perioada
          achiziționată, exceptând cazurile în care anunțul este retras pentru încălcarea regulilor.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">3. Rambursări</h2>
        <p>
          În general, sumele pentru servicii digitale de promovare <strong className="text-white">nu sunt
          rambursabile</strong> după activare, în linie cu{" "}
          <Link href="/terms" className="text-[#FF7900] hover:underline">
            Termenii și Condițiilor
          </Link>
          . Excepții pot exista când serviciul nu a putut fi livrat din cauza platformei sau când anunțul este retras
          de operator din motive de conformitate — aceste situații se analizează individual.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">4. Contact facturare</h2>
        <p>
          <a href="mailto:billing@clickanunt.ro" className="text-[#FF7900] hover:underline">
            billing@clickanunt.ro
          </a>
        </p>
      </section>
      <LegalFaqSection items={REFUND_FAQ} />
    </LegalPageLayout>
  );
}
