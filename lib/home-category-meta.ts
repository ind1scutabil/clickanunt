/** Static copy for homepage category tiles — no API, stable SSR/CSR. */

export type CategoryIconKey =
  | "auto"
  | "home"
  | "device"
  | "fashion"
  | "sofa"
  | "sport"
  | "child"
  | "pet"
  | "work"
  | "service"
  | "farm"
  | "other";

export const HOME_CATEGORY_CARD_META: Record<
  string,
  { icon: CategoryIconKey; sub: string }
> = {
  "Auto, moto și ambarcațiuni": {
    icon: "auto",
    sub: "Mașini, moto, piese și accesorii — cum te aștepți la o piață auto serioasă.",
  },
  Imobiliare: {
    icon: "home",
    sub: "Apartamente, case și terenuri, cu filtre pe oraș și județ.",
  },
  "Electronice și electrocasnice": {
    icon: "device",
    sub: "Telefoane, laptopuri, electrocasnice — tot ce ține de tehnică și casă.",
  },
  "Modă și frumusețe": {
    icon: "fashion",
    sub: "Haine, încălțăminte și produse de îngrijire, pe categorii clare.",
  },
  "Casă și grădină": {
    icon: "sofa",
    sub: "Mobilier, decor, unelte și tot ce îți trebuie pentru locuință și curte.",
  },
  "Sport, timp liber și artă": {
    icon: "sport",
    sub: "Echipament sportiv, hobby-uri, cărți și obiecte de colecție.",
  },
  "Copii și bebeluși": {
    icon: "child",
    sub: "Haine, cărucioare, jucării și articole pentru cei mici.",
  },
  "Animale de companie": {
    icon: "pet",
    sub: "Animale, accesorii și servicii pentru companioni — totul la un loc.",
  },
  "Locuri de muncă": {
    icon: "work",
    sub: "Joburi și candidați, cu anunțuri structurate pe domeniu.",
  },
  "Servicii și afaceri": {
    icon: "service",
    sub: "Meserii, firme și servicii locale — de la reparații la consultanță.",
  },
  Agricultură: {
    icon: "farm",
    sub: "Utilaje, animale, terenuri și tot ce ține de fermă și câmp.",
  },
  Altele: {
    icon: "other",
    sub: "Diverse anunțuri care nu intră în celelalte categorii.",
  },
};

const SLUG_TO_VISUAL: Record<string, CategoryIconKey> = {
  auto: "auto",
  imobiliare: "home",
  electronice: "device",
  fashion: "fashion",
  moda: "fashion",
  casa: "sofa",
  sport: "sport",
  copii: "child",
  animale: "pet",
  "locuri-de-munca": "work",
  servicii: "service",
  agricultura: "farm",
  altele: "other",
};

export function categoryVisualKeyFromLabel(label: string): CategoryIconKey {
  const t = label.trim();
  const fromSlug = SLUG_TO_VISUAL[t.toLowerCase()];
  if (fromSlug) return fromSlug;
  const meta = HOME_CATEGORY_CARD_META[label];
  return meta?.icon ?? "other";
}
