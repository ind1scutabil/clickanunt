import { CITIES_BY_COUNTY } from "@/lib/carData";
import { CAR_MAKES_AND_MODELS } from "@/lib/carData";
import { isAutoCategory } from "@/lib/listing-category-specs";

export function isKnownCounty(county: string | null | undefined): boolean {
  if (!county || typeof county !== "string") return false;
  return Object.prototype.hasOwnProperty.call(CITIES_BY_COUNTY, county);
}

export function isCityInCounty(
  county: string | null | undefined,
  city: string | null | undefined
): boolean {
  if (!county || !city) return false;
  if (!isKnownCounty(county)) return false;
  const cities = CITIES_BY_COUNTY[county as keyof typeof CITIES_BY_COUNTY] || [];
  return cities.includes(city);
}

export function isKnownMake(make: string | null | undefined): boolean {
  if (!make) return false;
  return Object.prototype.hasOwnProperty.call(CAR_MAKES_AND_MODELS, make);
}

export function isModelForMake(
  make: string | null | undefined,
  model: string | null | undefined
): boolean {
  if (!make || !model) return false;
  if (!isKnownMake(make)) return false;
  const models =
    CAR_MAKES_AND_MODELS[make as keyof typeof CAR_MAKES_AND_MODELS] || [];
  return models.includes(model);
}

/** When category is Auto and make/model present, both must be consistent. */
export function assertAutoMakeModelPair(input: {
  category: string;
  make?: string | null;
  model?: string | null;
}): { ok: true } | { ok: false; message: string; path: "make" | "model" } {
  if (!isAutoCategory(input.category)) {
    const make = input.make?.trim() || "";
    const model = input.model?.trim() || "";
    if (make || model) {
      return {
        ok: false,
        message: "Câmpurile marcă/model sunt valabile doar pentru categoria Auto",
        path: make ? "make" : "model",
      };
    }
    return { ok: true };
  }
  const make = input.make?.trim() || "";
  const model = input.model?.trim() || "";
  if (!make && !model) return { ok: true };
  if (model && !make) {
    return {
      ok: false,
      message: "Selectează marca înainte de model",
      path: "make",
    };
  }
  if (make && !model) {
    return {
      ok: false,
      message: "Adaugă modelul pentru categoria Auto",
      path: "model",
    };
  }
  if (make && !isKnownMake(make)) {
    return { ok: false, message: "Marca selectată nu este validă", path: "make" };
  }
  if (make && model && !isModelForMake(make, model)) {
    return {
      ok: false,
      message: `Modelul nu aparține mărcii ${make}`,
      path: "model",
    };
  }
  return { ok: true };
}
