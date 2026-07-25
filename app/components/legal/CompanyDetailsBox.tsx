import { getPublicCompanyDetails } from "@/lib/company-public";

export function CompanyDetailsBox() {
  const d = getPublicCompanyDetails();
  if (!d.name && !d.cui && !d.registration && !d.address) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
        <p className="font-medium text-amber-50">Date operator</p>
        <p className="mt-2 text-amber-100/80">
          Datele legale ale operatorului (denumire, CUI, registrul comerțului, adresă) nu sunt publicate pe site
          momentan. Pentru solicitări oficiale, scrieți la{" "}
          <a href="mailto:contact@clickanunt.ro" className="underline">
            contact@clickanunt.ro
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-sm text-gray-200">
      {d.name ? (
        <p>
          <strong className="text-white">Denumire:</strong> {d.name}
        </p>
      ) : null}
      {d.cui ? (
        <p>
          <strong className="text-white">CUI / Cod fiscal:</strong> {d.cui}
        </p>
      ) : null}
      {d.registration ? (
        <p>
          <strong className="text-white">Registrul Comerțului:</strong> {d.registration}
        </p>
      ) : null}
      {d.address ? (
        <p>
          <strong className="text-white">Adresă:</strong> {d.address}
          {d.country ? `, ${d.country}` : ""}
        </p>
      ) : null}
    </div>
  );
}
