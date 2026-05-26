import type { Metadata } from "next";
import { LegalPageLayout } from "@/app/components/legal/LegalPageLayout";
import { CompanyDetailsBox } from "@/app/components/legal/CompanyDetailsBox";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Anunțuri interzise — ClickAnunt",
  description: "Conținut și produse care nu pot fi publicate pe ClickAnunt.",
  alternates: { canonical: "/anunturi-interzise" },
};

const PROHIBITED = [
  "Arme, muniție, explozibili și accesorii reglementate fără respectarea legii",
  "Droguri, precursori sau substanțe ilegale",
  "Medicamente și dispozitive medicale vândute fără autorizație sau prescripție conform legii",
  "Produse contrafăcute sau care încalcă drepturi de marcă",
  "Acte, diplome, documente de identitate false sau servicii de falsificare",
  "Servicii ilegale sau care încalcă ordinea publică",
  "Hacking, spyware, malware, crearea sau distribuirea de instrumente pentru acces neautorizat",
  "Baze de date cu date personale, liste de contact culese ilegal",
  "Animale protejate sau comercializate ilegal",
  "Servicii adult / escort sau conținut sexual explicit în încălcarea legii",
  "Fraude financiare, scheme „get rich quick”, crypto scam, investiții nereglementate înșelătoare",
  "Conturi digitale (ex. licențe, conturi de jocuri) vândute în mod care încalcă T&C-ul furnizorului sau legea",
  "Bunuri furate sau cu proveniență inexistentă",
  "Produse periculoase, retrase de pe piață sau fără documentație legală",
  "Conținut care încalcă drepturi de autor sau drepturi conexe (fără drept de utilizare)",
];

export default function ProhibitedListingsPage() {
  return (
    <LegalPageLayout title="Politica anunțuri interzise" accentClassName="text-[#FF7900]">
      <CompanyDetailsBox />
      <p>
        ClickAnunt este o platformă de publicare anunțuri. Utilizatorii răspund pentru legalitatea conținutului.
        Putem șterge anunțuri, suspenda conturi și păstra înregistrări tehnice pentru siguranță, conform{" "}
        <Link href="/terms" className="text-[#FF7900] hover:underline">
          Termenilor și Condițiilor
        </Link>
        .
      </p>
      <section>
        <h2 className="mb-3 text-2xl font-semibold text-white">Exemple de conținut interzis</h2>
        <ul className="ml-4 list-inside list-disc space-y-2">
          {PROHIBITED.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-gray-400">
        Lista nu este limitativă — orice anunț care încalcă legea română sau UE poate fi eliminat.
      </p>
    </LegalPageLayout>
  );
}
