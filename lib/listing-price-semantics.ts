/**
 * Price field UI semantics by category — no new DB enums.
 * Until a reviewed migration, Listing.priceAmount remains required Int > 0 for all categories.
 *
 * Jobs: do NOT label priceAmount as real salary; salary_range is free text only.
 */
import { getCategoryDef } from "@/lib/taxonomy";

export type PriceFieldMeaning =
  | "product_price"
  | "jobs_compat_placeholder"
  | "service_rate"
  | "placeholder_required";

export type PriceFieldSemantics = {
  label: string;
  hint: string;
  meaning: PriceFieldMeaning;
  /** Always true with current Prisma schema (non-null Int + create gt(0)). */
  amountStillRequired: true;
};

export function getPriceFieldSemantics(
  categoryLabel: string | null | undefined
): PriceFieldSemantics {
  const slug = categoryLabel ? getCategoryDef(categoryLabel)?.slug : undefined;

  switch (slug) {
    case "locuri-de-munca":
      return {
        label: "Valoare numerică (compatibilitate)",
        hint: "Limitare tehnică: baza de date cere un număr > 0. Nu reprezintă un salariu structurat (lipsesc salaryMin/Max/period). Detaliile salariale libere pot fi în atributul „Salariu (RON)” dacă e disponibil.",
        meaning: "jobs_compat_placeholder",
        amountStillRequired: true,
      };
    case "servicii":
      return {
        label: "Tarif (RON/EUR)",
        hint: "Tipul Fix / Negociabil / Pe oră / La cerere se completează în atributele categoriei. Valoarea numerică rămâne obligatorie (> 0) până la o migrare priceType. Nu presupune automat „pe oră” fără atribut.",
        meaning: "service_rate",
        amountStillRequired: true,
      };
    case "altele":
      return {
        label: "Preț",
        hint: "Pentru donații, schimb sau pierdut/găsit nu există tip „gratuit” în DB — valoarea trebuie să fie > 0. Nu afișa „gratuit” până la migrare.",
        meaning: "placeholder_required",
        amountStillRequired: true,
      };
    default:
      return {
        label: "Preț",
        hint: "",
        meaning: "product_price",
        amountStillRequired: true,
      };
  }
}

/** Categories where Product+Offer price would misrepresent the listing. */
export function shouldOmitProductOfferPrice(categoryLabel: string): boolean {
  const kind = getCategoryDef(categoryLabel)?.slug;
  return (
    kind === "locuri-de-munca" ||
    kind === "imobiliare" ||
    kind === "servicii" ||
    kind === "animale" ||
    kind === "altele"
  );
}

/**
 * Card / detail price line — factual labels only.
 * Jobs: show salary_range text as free-text detail when present; never claim structured salary.
 */
export function formatCategoryAwarePriceLine(params: {
  categoryLabel: string | null | undefined;
  priceAmount: number | null | undefined;
  priceCurrency?: string | null;
  attributes?: Record<string, unknown> | null;
}): { primary: string; suffix?: string } {
  const { categoryLabel, priceAmount, priceCurrency, attributes } = params;
  const semantics = getPriceFieldSemantics(categoryLabel);
  const amount =
    typeof priceAmount === "number" && Number.isFinite(priceAmount) ? priceAmount : null;
  const code = (priceCurrency || "RON").trim().toUpperCase() || "RON";

  if (semantics.meaning === "jobs_compat_placeholder") {
    const range =
      typeof attributes?.salary_range === "string" ? attributes.salary_range.trim() : "";
    if (range) {
      return { primary: range, suffix: "detalii text" };
    }
    if (amount != null && amount > 0) {
      const formatted = new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
      return { primary: `${formatted} ${code}`, suffix: "valoare tehnică" };
    }
    return { primary: "Nespecificat" };
  }

  if (semantics.meaning === "service_rate") {
    const pricing =
      typeof attributes?.pricing_type === "string" ? attributes.pricing_type.trim() : "";
    if (amount == null || amount === 0) {
      return { primary: pricing || "Negociabil" };
    }
    const formatted = new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return {
      primary: `${formatted} ${code}`,
      suffix: pricing || undefined,
    };
  }

  if (amount == null || amount === 0) {
    return { primary: "Negociabil" };
  }
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return { primary: `${formatted} ${code}` };
}
