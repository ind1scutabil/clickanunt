/**
 * Factual title feedback for listing publish wizard.
 * Never claim "perfect" — only short / hint / clear.
 */

const KNOWN_AUTO_MAKES_SHORT = new Set(
  [
    "peugeot",
    "bmw",
    "audi",
    "mercedes",
    "mercedes-benz",
    "volkswagen",
    "vw",
    "dacia",
    "renault",
    "ford",
    "opel",
    "toyota",
    "skoda",
    "hyundai",
    "kia",
    "seat",
    "volvo",
    "nissan",
    "mazda",
    "honda",
    "fiat",
    "citroen",
    "citroën",
  ].map((s) => s.toLowerCase())
);

export type ListingTitleFeedback = {
  tone: "error" | "hint" | "ok";
  message: string;
} | null;

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

/**
 * Returns feedback for a non-empty title. Callers still enforce min length on submit.
 */
export function getListingTitleFeedback(input: {
  title: string;
  isAutoCategory: boolean;
  make?: string | null;
  model?: string | null;
}): ListingTitleFeedback {
  const title = normalizeTitle(input.title);
  if (!title) return null;

  if (title.length < 5) {
    return { tone: "error", message: "Titlul este prea scurt." };
  }

  const lower = title.toLowerCase();
  const make = (input.make || "").trim();
  const model = (input.model || "").trim();

  if (input.isAutoCategory) {
    const makeOnly =
      (make && lower === make.toLowerCase() && !model) ||
      (!make && KNOWN_AUTO_MAKES_SHORT.has(lower));

    const makeWithoutModelInTitle =
      make &&
      model &&
      lower === make.toLowerCase();

    if (makeOnly || makeWithoutModelInTitle || (make && !model && lower.includes(make.toLowerCase()) && lower.length <= make.length + 2)) {
      return {
        tone: "hint",
        message: "Adaugă modelul pentru ca anunțul să fie găsit mai ușor.",
      };
    }

    if (make && !model && KNOWN_AUTO_MAKES_SHORT.has(lower)) {
      return {
        tone: "hint",
        message: "Adaugă modelul pentru ca anunțul să fie găsit mai ușor.",
      };
    }
  }

  const vague = /^(vand|vând|masina|mașină|masina de vanzare|mașină de vânzare|de vanzare|de vânzare)(\s+masina|\s+mașină)?$/i;
  if (vague.test(lower)) {
    return {
      tone: "hint",
      message: "Adaugă modelul pentru ca anunțul să fie găsit mai ușor.",
    };
  }

  return { tone: "ok", message: "Titlul este clar." };
}
