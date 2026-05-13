import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";

export const metadata: Metadata = {
  title: "Notice și retragere conținut — ClickAnunt",
  description: "Procedură pentru reclamații privind drepturi de autor și mărci pe ClickAnunt.",
};

export default function NoticeTakedownPage() {
  return (
    <LegalPageLayout title="Copyright, mărci și retragere conținut" accentClassName="text-[#FF7900]">
      <CompanyDetailsBox />
      <p>
        Respectăm drepturile de proprietate intelectuală. Dacă consideri că un anunț folosește abuziv imaginea ta,
        marca ta sau conținut protejat, trimite o solicitare structurată la adresele de mai jos.
      </p>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Date de inclus în solicitare</h2>
        <ul className="ml-4 list-inside list-disc space-y-2 text-sm">
          <li>Linkul exact al anunțului pe ClickAnunt</li>
          <li>Descrierea obiectului protejat (ex. titular drepturi de autor / marcă)</li>
          <li>Dovada reprezentării (dacă acționezi pentru terți)</li>
          <li>Declarație de bună-credință că utilizarea nu este autorizată</li>
          <li>Date de contact (nume, email, telefon opțional)</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Canale</h2>
        <p>
          Email:{" "}
          <a href="mailto:admin@clickanunt.ro" className="text-[#FF7900] hover:underline">
            admin@clickanunt.ro
          </a>{" "}
          și copie opțională{" "}
          <a href="mailto:dpo@clickanunt.ro" className="text-[#FF7900] hover:underline">
            dpo@clickanunt.ro
          </a>{" "}
          pentru aspecte care includ date personale.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Vom analiza solicitarea rezonabil din punct de vedere comercial și putem elimina sau dezactiva conținutul
          reclamat, fără a recunoaște automat fondul unei dispute între părți.
        </p>
      </section>
    </LegalPageLayout>
  );
}
