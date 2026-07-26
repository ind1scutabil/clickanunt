/**
 * Category → structured data policy (factual only; omit when unsure).
 */
import { getCategoryDef } from "@/lib/taxonomy";

export type ListingJsonLdKind =
  | "product_offer"
  | "product_car"
  | "job_posting"
  | "omit_commercial";

export function listingJsonLdKindForCategory(categoryLabel: string): ListingJsonLdKind {
  const slug = getCategoryDef(categoryLabel)?.slug;
  switch (slug) {
    case "auto":
      return "product_car";
    case "locuri-de-munca":
      return "job_posting";
    case "electronice":
    case "moda":
    case "casa-si-gradina":
    case "sport":
    case "copii":
    case "agricultura":
      return "product_offer";
    case "imobiliare":
    case "servicii":
    case "animale":
    case "altele":
    default:
      // Safer to emit breadcrumbs only than invent RealEstateListing / Service / Product.
      return "omit_commercial";
  }
}
