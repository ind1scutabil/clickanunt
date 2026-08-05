/**
 * Canonical commercial price-type + Jobs salary policy.
 * Shared by web (via lib re-export), API validation, and Expo (direct import).
 * Keep subcategory labels aligned with MARKETPLACE_TAXONOMY.
 */
import { MARKETPLACE_TAXONOMY } from './taxonomy';

export const PRICE_TYPES = [
  'FIXED',
  'NEGOTIABLE',
  'FREE',
  'ON_REQUEST',
  'FROM',
] as const;

export type PriceTypeValue = (typeof PRICE_TYPES)[number];

export const SALARY_PERIODS = [
  'HOUR',
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
] as const;

export type SalaryPeriodValue = (typeof SALARY_PERIODS)[number];

export const PRICE_TYPE_LABEL_RO: Record<PriceTypeValue, string> = {
  FIXED: 'Preț fix',
  NEGOTIABLE: 'Negociabil',
  FREE: 'Gratuit',
  ON_REQUEST: 'Preț la cerere',
  FROM: 'De la',
};

export const SALARY_PERIOD_LABEL_RO: Record<SalaryPeriodValue, string> = {
  HOUR: 'oră',
  DAY: 'zi',
  WEEK: 'săptămână',
  MONTH: 'lună',
  YEAR: 'an',
};

const ALL_COMMERCIAL: readonly PriceTypeValue[] = [
  'FIXED',
  'NEGOTIABLE',
  'FREE',
  'ON_REQUEST',
  'FROM',
];

const PRODUCT_TYPES: readonly PriceTypeValue[] = ['FIXED', 'NEGOTIABLE', 'FREE'];

const SERVICE_TYPES: readonly PriceTypeValue[] = [
  'FIXED',
  'NEGOTIABLE',
  'ON_REQUEST',
  'FROM',
];

const REAL_ESTATE_TYPES: readonly PriceTypeValue[] = [
  'FIXED',
  'NEGOTIABLE',
  'ON_REQUEST',
  'FROM',
];

const VEHICLE_TYPES: readonly PriceTypeValue[] = ['FIXED', 'NEGOTIABLE'];

const AUTO_VEHICLE_SUBS = new Set([
  'Autoturisme',
  'Autoutilitare',
  'SUV/Off-road',
  'Camioane',
  'Rulote și remorci',
  'Motociclete/Scutere',
  'ATV',
  'Scutere/UTV',
  'Ambarcațiuni',
]);

const AUTO_PARTS_SUBS = new Set([
  'Piese auto',
  'Accesorii auto',
  'Roți/Jante/Anvelope',
  'Caroserie/Interior',
  'Consumabile/Accesorii',
]);

const AUTO_SERVICE_SUBS = new Set([
  'Service auto',
  'Dezmembrări',
  'Mecanică/Electrică',
]);

const ANIMAL_SALE_SUBS = new Set([
  'Câini',
  'Pisici',
  'Păsări',
  'Pești acvariu',
  'Rozătoare',
]);

const ANIMAL_PRODUCT_SUBS = new Set(['Accesorii animale', 'Hrană animale']);

function categorySlug(categoryLabel: string): string | undefined {
  return MARKETPLACE_TAXONOMY.find((c) => c.label === categoryLabel)?.slug;
}

/**
 * Allowed commercial price types for a category (+ optional subcategory).
 * Empty array = commercial price types not used (Jobs).
 */
export function allowedPriceTypesFor(
  categoryLabel: string,
  subcategoryLabel?: string | null,
): readonly PriceTypeValue[] {
  const slug = categorySlug(categoryLabel);
  const sub = subcategoryLabel?.trim() || '';

  switch (slug) {
    case 'locuri-de-munca':
      return [];
    case 'auto':
      if (AUTO_VEHICLE_SUBS.has(sub)) return VEHICLE_TYPES;
      if (AUTO_SERVICE_SUBS.has(sub)) return SERVICE_TYPES;
      if (AUTO_PARTS_SUBS.has(sub) || !sub) return PRODUCT_TYPES;
      return VEHICLE_TYPES;
    case 'imobiliare':
      return REAL_ESTATE_TYPES;
    case 'servicii':
      return SERVICE_TYPES;
    case 'electronice':
    case 'moda':
    case 'casa-si-gradina':
    case 'sport':
    case 'copii':
    case 'agricultura':
      return PRODUCT_TYPES;
    case 'animale':
      if (ANIMAL_SALE_SUBS.has(sub)) return VEHICLE_TYPES;
      if (sub === 'Servicii animale') return SERVICE_TYPES;
      if (ANIMAL_PRODUCT_SUBS.has(sub) || !sub) return PRODUCT_TYPES;
      return VEHICLE_TYPES;
    case 'altele':
      if (sub === 'Donații') return ['FREE'] as const;
      if (sub === 'Pierdut/Găsit') return ['ON_REQUEST'] as const;
      if (sub === 'Schimb') return ['ON_REQUEST', 'NEGOTIABLE'] as const;
      return ALL_COMMERCIAL;
    default:
      return PRODUCT_TYPES;
  }
}

export function isJobsCategoryLabel(categoryLabel: string): boolean {
  return categorySlug(categoryLabel) === 'locuri-de-munca';
}

export function priceTypeRequiresAmount(type: PriceTypeValue): boolean {
  return type === 'FIXED' || type === 'NEGOTIABLE' || type === 'FROM';
}

export function priceTypeForbidsAmount(type: PriceTypeValue): boolean {
  return type === 'FREE' || type === 'ON_REQUEST';
}

export type PriceSalaryValidationIssue = {
  path: string;
  message: string;
};

export type PriceSalaryFields = {
  category: string;
  subcategory?: string | null;
  priceType?: PriceTypeValue | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriodValue | null;
};

/**
 * Validate commercial price + salary rules.
 * Call normalizeLegacyPricePayload first for create payloads from old clients.
 */
export function validatePriceSalaryFields(
  data: PriceSalaryFields,
  opts: { mode: 'create' | 'update'; allowLegacyJobPriceAmount?: boolean } = {
    mode: 'create',
  },
): PriceSalaryValidationIssue[] {
  const issues: PriceSalaryValidationIssue[] = [];
  const jobs = isJobsCategoryLabel(data.category);

  const hasSalary =
    data.salaryMin != null ||
    data.salaryMax != null ||
    data.salaryCurrency != null ||
    data.salaryPeriod != null;

  if (jobs) {
    if (data.priceType != null) {
      issues.push({
        path: 'priceType',
        message: 'Locurile de muncă nu folosesc tip de preț comercial',
      });
    }
    const legacyAmountOk =
      opts.allowLegacyJobPriceAmount &&
      opts.mode === 'create' &&
      !hasSalary;
    if (data.priceAmount != null && !legacyAmountOk) {
      issues.push({
        path: 'priceAmount',
        message: hasSalary
          ? 'Nu combina prețul legacy cu salariul structurat'
          : 'Locurile de muncă nu folosesc preț de produs',
      });
    }

    if (hasSalary) {
      const min = data.salaryMin;
      const max = data.salaryMax;
      if (min != null && (!(Number.isFinite(min) && min > 0) || min > 99_999_999)) {
        issues.push({ path: 'salaryMin', message: 'Salariul minim trebuie să fie > 0' });
      }
      if (max != null && (!(Number.isFinite(max) && max > 0) || max > 99_999_999)) {
        issues.push({ path: 'salaryMax', message: 'Salariul maxim trebuie să fie > 0' });
      }
      if (min != null && max != null && max < min) {
        issues.push({
          path: 'salaryMax',
          message: 'Salariul maxim nu poate fi mai mic decât minimul',
        });
      }
      if ((min != null || max != null) && !data.salaryCurrency) {
        issues.push({
          path: 'salaryCurrency',
          message: 'Moneda salarială este obligatorie când există salariu',
        });
      }
      if ((min != null || max != null) && !data.salaryPeriod) {
        issues.push({
          path: 'salaryPeriod',
          message: 'Perioada salarială este obligatorie când există salariu',
        });
      }
      if (
        data.salaryCurrency &&
        !['RON', 'EUR', 'USD'].includes(String(data.salaryCurrency).toUpperCase())
      ) {
        issues.push({ path: 'salaryCurrency', message: 'Monedă salarială invalidă' });
      }
      if (data.salaryPeriod && !SALARY_PERIODS.includes(data.salaryPeriod)) {
        issues.push({ path: 'salaryPeriod', message: 'Perioadă salarială invalidă' });
      }
    }
    return issues;
  }

  if (hasSalary) {
    issues.push({
      path: 'salaryMin',
      message: 'Câmpurile salariale sunt permise numai pentru Locuri de muncă',
    });
  }

  const allowed = allowedPriceTypesFor(data.category, data.subcategory);
  const type = data.priceType;
  if (!type) {
    issues.push({ path: 'priceType', message: 'Tipul de preț este obligatoriu' });
    return issues;
  }
  if (!PRICE_TYPES.includes(type)) {
    issues.push({ path: 'priceType', message: 'Tip de preț invalid' });
    return issues;
  }
  if (!allowed.includes(type)) {
    issues.push({
      path: 'priceType',
      message: `Tipul de preț "${type}" nu este permis pentru această categorie`,
    });
  }

  const amount = data.priceAmount;
  if (priceTypeRequiresAmount(type)) {
    if (amount == null || !(Number.isFinite(amount) && amount > 0)) {
      issues.push({
        path: 'priceAmount',
        message: 'Prețul trebuie să fie mai mare de 0 pentru acest tip',
      });
    }
    if (!data.priceCurrency) {
      issues.push({ path: 'priceCurrency', message: 'Moneda este obligatorie' });
    }
  }
  if (priceTypeForbidsAmount(type) && amount != null) {
    issues.push({
      path: 'priceAmount',
      message: 'Prețul trebuie să lipsească pentru Gratuit / La cerere',
    });
  }
  if (
    data.priceCurrency &&
    !['RON', 'EUR', 'USD'].includes(String(data.priceCurrency).toUpperCase())
  ) {
    issues.push({ path: 'priceCurrency', message: 'Monedă invalidă' });
  }

  return issues;
}

/**
 * Normalize legacy create payload (mobile/old clients without priceType).
 * Non-Job + priceAmount > 0 + no priceType → FIXED.
 * Jobs with only priceAmount → keep amount as legacy (no salary invent); strip commercial type.
 */
export function normalizeLegacyPricePayload(input: {
  category: string;
  subcategory?: string | null;
  priceType?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
}): {
  priceType: PriceTypeValue | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  legacyJobPriceAmount: boolean;
} {
  const jobs = isJobsCategoryLabel(input.category);
  const amount =
    typeof input.priceAmount === 'number' && Number.isFinite(input.priceAmount)
      ? input.priceAmount
      : null;
  const currency = input.priceCurrency
    ? String(input.priceCurrency).toUpperCase()
    : 'RON';

  if (jobs) {
    return {
      priceType: null,
      priceAmount: amount != null && amount > 0 ? amount : null,
      priceCurrency: null,
      legacyJobPriceAmount: amount != null && amount > 0 && !input.priceType,
    };
  }

  if (input.priceType && PRICE_TYPES.includes(input.priceType as PriceTypeValue)) {
    const type = input.priceType as PriceTypeValue;
    return {
      priceType: type,
      priceAmount: priceTypeForbidsAmount(type) ? null : amount,
      priceCurrency: priceTypeForbidsAmount(type) ? null : currency,
      legacyJobPriceAmount: false,
    };
  }

  if (amount != null && amount > 0) {
    return {
      priceType: 'FIXED',
      priceAmount: amount,
      priceCurrency: currency,
      legacyJobPriceAmount: false,
    };
  }

  return {
    priceType: null,
    priceAmount: amount,
    priceCurrency: currency,
    legacyJobPriceAmount: false,
  };
}

/** Client copy for price / salary field groups. */
export function getMarketplacePriceFieldCopy(categoryLabel: string | null | undefined): {
  label: string;
  hint: string;
  mode: 'commercial' | 'salary' | 'unknown';
} {
  if (!categoryLabel) {
    return { label: 'Preț', hint: '', mode: 'unknown' };
  }
  if (isJobsCategoryLabel(categoryLabel)) {
    return {
      label: 'Salariu',
      hint: 'Opțional. Exact, interval, sau nespecificat. Nu folosi preț de produs.',
      mode: 'salary',
    };
  }
  return {
    label: 'Preț',
    hint: 'Alege tipul de preț permis pentru categorie.',
    mode: 'commercial',
  };
}
