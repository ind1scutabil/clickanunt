/**
 * County / city / auto make-model — same source as web (`lib/carData.ts`).
 * Metro alias `@` → monorepo root (see apps/mobile/metro.config.js).
 */
export {
  CAR_MAKES_AND_MODELS,
  CITIES_BY_COUNTY,
  POPULAR_MAKES,
  ROMANIAN_COUNTIES,
} from '@/lib/carData';

export {
  assertAutoMakeModelPair,
  isCityInCounty,
  isKnownCounty,
  isKnownMake,
  isModelForMake,
} from '@/lib/listing-location-make-validation';

/** Category label used by web + mobile for Auto make/model fields. */
export const AUTO_CATEGORY_LABEL = 'Auto, moto și ambarcațiuni';
