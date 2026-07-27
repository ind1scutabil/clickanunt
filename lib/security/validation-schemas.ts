/**
 * COMPREHENSIVE INPUT VALIDATION SCHEMAS
 * All request bodies/query params validated with Zod
 * 
 * Coverage: 45 API endpoints across auth, listings, admin, payments
 */

import { z } from 'zod';
import { normalizeCountryOfOriginValue } from '@/lib/listing-country-options';
import { isValidListingPhotoUrl } from '../listing-photo-url';
import {
  PASSWORD_DIGIT_RE,
  PASSWORD_LOWERCASE_RE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_RE,
  PASSWORD_UPPERCASE_RE,
} from './password-rules';
import { VALID_CATEGORY_LABELS, isValidSubcategory } from '@/lib/taxonomy';
import {
  assertAutoMakeModelPair,
  isCityInCounty,
  isKnownCounty,
} from '@/lib/listing-location-make-validation';
import {
  findIncompatibleAutoTopLevelFields,
  isSubcategoryRequired,
  sanitizeListingAttributes,
} from '@/lib/listing-attributes-sanitize';
import {
  isJobsCategory,
  normalizeLegacyPricePayload,
  validatePriceSalaryFields,
  type PriceTypeValue,
  type SalaryPeriodValue,
  PRICE_TYPES,
  SALARY_PERIODS,
} from '@/lib/listing-price-salary-policy';

/**
 * URL pentru foto la create/edit/listing draft: permite https/http (CDN/stocare) și căi interne de upload
 * (ex. `/api/uploads/serve?key=...`), conform `isValidListingPhotoUrl`; refuză blob:/data:/poze invalide.
 */
const listingSubmittedPhotoUrlSchema = z.string().min(1).refine(
  (s) => {
    const t = s.trim();
    if (!t.length) return false;
    if (t.startsWith('blob:') || t.startsWith('data:')) return false;
    return isValidListingPhotoUrl(t);
  },
  { message: 'Invalid URL' }
);

/**
 * Shared/Common Schemas
 */
export const emailSchema = z
  .string()
  .email('Email invalid')
  .toLowerCase()
  .trim()
  .max(255, 'Email too long');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Parola minimum 8 caractere')
  .max(PASSWORD_MAX_LENGTH, 'Parola prea lungă')
  .regex(PASSWORD_UPPERCASE_RE, 'Parola trebuie să conțină o literă mare')
  .regex(PASSWORD_LOWERCASE_RE, 'Parola trebuie să conțină o literă mică')
  .regex(PASSWORD_DIGIT_RE, 'Parola trebuie să conțină o cifră')
  .regex(PASSWORD_SPECIAL_RE, 'Parola trebuie să conțină un simbol special');

export const nameSchema = z
  .string()
  .min(2, 'Nume minimum 2 caractere')
  .max(100, 'Nume maxim 100 caractere')
  .trim();

/** Telefon (RO / internațional): cifre, +, spații, paranteze, puncte — min. 7 caractere semnificative */
const PHONE_RE = /^[0-9+\-\s().]{7,32}$/;

export const phoneSchema = z.string().regex(PHONE_RE, 'Număr telefon invalid');

/** Câmp opțional sau gol în formulare */
export const phoneOptionalSchema = z.union([phoneSchema, z.literal('')]).optional();

export const uuidSchema = z.string().uuid('ID invalid');

/** Real listing UUID or draft folder id `temp-<uuid>` used before publish. */
export const listingUploadIdSchema = z.union([
  uuidSchema,
  z
    .string()
    .regex(
      /^temp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'ID anunț invalid pentru încărcare'
    ),
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  direction: z.enum(['next', 'prev']).default('next').optional(),
}).strict();

/**
 * === AUTH ENDPOINTS ===
 */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parola necesară'),
  rememberMe: z.boolean().default(false).optional(),
}).strict();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  acceptTerms: z.boolean().refine(v => v === true, 'Must accept terms'),
  acceptPrivacy: z.boolean().refine(v => v === true, 'Must accept privacy'),
}).strict().refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const businessCategorySchema = z.enum([
  'auto_dealer',
  'real_estate',
  'retail',
  'services',
  'other',
]);

export const registerExtendedSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(['personal', 'business']),
    name: z.string().max(100).trim(),
    acceptTerms: z.boolean().refine((v) => v === true, 'Trebuie să accepți termenii'),
    acceptPrivacy: z.boolean().refine((v) => v === true, 'Trebuie să accepți politica de confidențialitate'),
    businessName: z.string().max(200).optional(),
    businessCUI: z.string().max(32).optional(),
    businessRegCom: z.string().max(100).optional(),
    businessPhone: z.union([phoneSchema, z.literal('')]).optional(),
    businessEmail: z.union([z.literal(""), emailSchema]).optional(),
    businessLocation: z.string().max(200).optional(),
    businessDescription: z.string().max(2000).optional(),
    businessWebsite: z.union([z.literal(""), z.string().url("URL invalid")]).optional(),
    businessCategory: businessCategorySchema.optional(),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((d, ctx) => {
    if (d.accountType === 'personal') {
      if (d.name.trim().length < 2) {
        ctx.addIssue({ code: 'custom', message: 'Nume minimum 2 caractere', path: ['name'] });
      }
      return;
    }
    if (!d.businessName?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Numele firmei este obligatoriu', path: ['businessName'] });
    }
    if (!d.businessCUI?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'CUI / CIF obligatoriu', path: ['businessCUI'] });
    }
    if (!d.businessRegCom?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Nr. Reg. Com. obligatoriu', path: ['businessRegCom'] });
    }
    if (!d.businessPhone?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Telefon firmă obligatoriu', path: ['businessPhone'] });
    } else if (!PHONE_RE.test(d.businessPhone.trim())) {
      ctx.addIssue({ code: 'custom', message: 'Număr telefon invalid', path: ['businessPhone'] });
    }
    if (!d.businessLocation?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Oraș / județ obligatoriu', path: ['businessLocation'] });
    }
    if (!d.businessCategory) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selectează tipul activității',
        path: ['businessCategory'],
      });
    }
    if (d.name.trim().length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'Persoană de contact: minimum 2 caractere',
        path: ['name'],
      });
    }
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().optional(),
}).strict().refine(d => !d.confirmPassword || d.newPassword === d.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

const notificationPrefsFields = {
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  newMessages: z.boolean().optional(),
  priceAlerts: z.boolean().optional(),
  newsletter: z.boolean().optional(),
};

export const userNotificationPreferencesSchema = z
  .object(notificationPrefsFields)
  .strict()
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: 'Trimite cel puțin o preferință' }
  );

export const userProfileSettingsPatchSchema = z
  .object({
    name: nameSchema.optional(),
    phone: z.union([phoneSchema, z.literal("")]).optional(),
    location: z.string().max(200).trim().optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.name !== undefined || d.phone !== undefined || d.location !== undefined,
    { message: "Trimite cel puțin un câmp de actualizat" }
  );

export const accountDeactivateSchema = z
  .object({
    confirmText: z.string().min(1),
  })
  .strict()
  .refine((d) => d.confirmText === 'ȘTERGE', {
    message: 'Introdu exact textul ȘTERGE pentru confirmare',
    path: ['confirmText'],
  });

export const verify2FASchema = z.object({
  sessionToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits').optional(),
  backupCode: z.string().min(6).max(20).optional(),
  rememberDevice: z.boolean().default(false).optional(),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
}).strict();

/**
 * === LISTINGS ENDPOINTS ===
 */

const listingCreateBaseSchema = z.object({
  ownerUserId: uuidSchema.optional(),
  title: z.string().min(5, 'Titlu minim 5 caractere').max(200, 'Titlu maxim 200 caractere'),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(10, 'Descriere minim 10 caractere').max(10000, 'Descriere maxim 10000 caractere').optional().nullable()
  ),
  category: z.string().min(1, 'Categorie necesară'),
  subcategory: z.string().optional().nullable(),
  priceType: z
    .enum(['FIXED', 'NEGOTIABLE', 'FREE', 'ON_REQUEST', 'FROM'])
    .optional()
    .nullable(),
  /** Nullable for FREE / ON_REQUEST / Jobs. Legacy clients still send > 0. */
  priceAmount: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().max(99999999, 'Preț prea mare').nullable().optional()
  ),
  priceCurrency: z.enum(['RON', 'EUR', 'USD']).optional().nullable(),
  salaryMin: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().max(99999999).nullable().optional()
  ),
  salaryMax: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().max(99999999).nullable().optional()
  ),
  salaryCurrency: z.enum(['RON', 'EUR', 'USD']).optional().nullable(),
  salaryPeriod: z
    .enum(['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'])
    .optional()
    .nullable(),
  condition: z.enum(['new', 'used', 'refurbished', 'for_parts']).optional().nullable(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  mileage: z.coerce.number().int().min(0).max(9999999).optional().nullable(),
  city: z.string().min(1, 'Orașul este obligatoriu').max(100),
  county: z.string().min(1, 'Județul este obligatoriu').max(100),
  photos: z.array(listingSubmittedPhotoUrlSchema).min(1, 'Minim o imagine').max(20, 'Maxim 20 imagini'),
  // video intentionally omitted — Listing has no video column; strict schema → 400 if sent
  contactPhone: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v),
    phoneOptionalSchema
  ),
  /** Accepted for forward-compat; Listing has no allowMessages column — ignored on create. */
  allowMessages: z.boolean().optional(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  vin: z.string().max(50).optional().nullable(),
  fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas']).optional().nullable(),
  transmission: z.enum(['manual', 'automatic']).optional().nullable(),
  accidents: z.enum(['no', 'minor', 'major']).optional().nullable(),
  rare: z.boolean().optional(),
  horsepower: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  cylinderCapacity: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  bodyType: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  seatCount: z.coerce.number().int().min(1).max(20).optional().nullable(),
  doorCount: z.coerce.number().int().min(1).max(20).optional().nullable(),
  owners: z.coerce.number().int().min(1).max(100).optional().nullable(),
  keys: z.coerce.number().int().min(0).max(10).optional().nullable(),
  registrationDate: z.string().optional().nullable(),
  inspectionExpires: z.string().optional().nullable(),
  countryOfOrigin: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim()
        ? normalizeCountryOfOriginValue(v) || v.trim()
        : v,
    z.string().max(16).optional().nullable()
  ),
  environmentalClass: z.string().optional().nullable(),
  co2Emissions: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  upholstery: z.string().optional().nullable(),
  cocPapers: z.boolean().optional(),
  features: z.array(z.string()).default([]).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  /** Client upload session folder id — must match photo serve keys when publishing. */
  uploadSessionId: uuidSchema.optional(),
}).strict();

export const listingCreateSchema = listingCreateBaseSchema.superRefine((data, ctx) => {
  if (!VALID_CATEGORY_LABELS.has(data.category)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Categorie invalidă',
      path: ['category'],
    });
    return;
  }

  const sub = typeof data.subcategory === 'string' ? data.subcategory.trim() : '';
  if (isSubcategoryRequired(data.category)) {
    if (!sub) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subcategoria este obligatorie pentru această categorie',
        path: ['subcategory'],
      });
    } else if (!isValidSubcategory(data.category, sub)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Subcategoria "${sub}" nu este validă pentru categoria "${data.category}"`,
        path: ['subcategory'],
      });
    }
  } else if (sub && !isValidSubcategory(data.category, sub)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Subcategoria "${sub}" nu este validă pentru categoria "${data.category}"`,
      path: ['subcategory'],
    });
  }

  if (!isKnownCounty(data.county)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Județ invalid',
      path: ['county'],
    });
  } else if (!isCityInCounty(data.county, data.city)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Orașul nu aparține județului selectat',
      path: ['city'],
    });
  }

  const makeModel = assertAutoMakeModelPair({
    category: data.category,
    make: data.make,
    model: data.model,
  });
  if (!makeModel.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: makeModel.message,
      path: [makeModel.path],
    });
  }

  const incompatible = findIncompatibleAutoTopLevelFields(data.category, {
    make: data.make,
    model: data.model,
    vin: data.vin,
    year: data.year,
    mileage: data.mileage,
    fuel: data.fuel,
    transmission: data.transmission,
  });
  for (const field of incompatible) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Câmpul "${field}" nu este permis pentru categoria "${data.category}"`,
      path: [field],
    });
  }

  if (data.attributes !== undefined) {
    const { strippedKeys } = sanitizeListingAttributes(
      data.category,
      sub || null,
      data.attributes
    );
    if (strippedKeys.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Atribute incompatibile cu categoria: ${strippedKeys.join(', ')}`,
        path: ['attributes'],
      });
    }
  }

  const normalized = normalizeLegacyPricePayload({
    category: data.category,
    subcategory: sub || null,
    priceType: data.priceType ?? null,
    priceAmount: data.priceAmount ?? null,
    priceCurrency: data.priceCurrency ?? null,
  });

  const priceIssues = validatePriceSalaryFields(
    {
      category: data.category,
      subcategory: sub || null,
      priceType: normalized.priceType,
      priceAmount: isJobsCategory(data.category)
        ? normalized.legacyJobPriceAmount
          ? normalized.priceAmount
          : null
        : normalized.priceAmount,
      priceCurrency: normalized.priceCurrency,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency ?? null,
      salaryPeriod: (data.salaryPeriod as SalaryPeriodValue | null) ?? null,
    },
    {
      mode: 'create',
      allowLegacyJobPriceAmount: normalized.legacyJobPriceAmount,
    }
  );
  for (const issue of priceIssues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [issue.path],
    });
  }
}).transform((data) => {
  const sub = typeof data.subcategory === 'string' ? data.subcategory.trim() : '';
  const normalized = normalizeLegacyPricePayload({
    category: data.category,
    subcategory: sub || null,
    priceType: data.priceType ?? null,
    priceAmount: data.priceAmount ?? null,
    priceCurrency: data.priceCurrency ?? null,
  });
  const jobs = isJobsCategory(data.category);
  return {
    ...data,
    priceType: jobs ? null : normalized.priceType,
    priceAmount: jobs
      ? normalized.legacyJobPriceAmount
        ? normalized.priceAmount
        : null
      : normalized.priceAmount,
    priceCurrency: jobs ? null : normalized.priceCurrency ?? 'RON',
    salaryMin: jobs ? data.salaryMin ?? null : null,
    salaryMax: jobs ? data.salaryMax ?? null : null,
    salaryCurrency: jobs ? data.salaryCurrency ?? null : null,
    salaryPeriod: jobs ? data.salaryPeriod ?? null : null,
  };
});

const listingEditYearSchema = z.preprocess(
  (v) => {
    if (v === '' || v === '0' || v === 0 || v === null || v === undefined) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    return v;
  },
  z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable()
);

const listingEditFuelSchema = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v !== 'string') return v;
    const normalized = v.trim().toLowerCase();
    const map: Record<string, string> = {
      benzina: 'petrol',
      benzină: 'petrol',
      motorina: 'diesel',
      motorină: 'diesel',
      hibrid: 'hybrid',
      gpl: 'lpg',
    };
    return map[normalized] || normalized;
  },
  z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas']).optional().nullable()
);

const listingEditTransmissionSchema = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v !== 'string') return v;
    const normalized = v.trim().toLowerCase();
    if (normalized === 'manuală' || normalized === 'manuala') return 'manual';
    if (normalized === 'automată' || normalized === 'automata') return 'automatic';
    return normalized;
  },
  z.enum(['manual', 'automatic']).optional().nullable()
);

export const listingEditSchema = listingCreateBaseSchema
  .partial()
  // Ownership is server-derived; never accept client ownerUserId on PATCH.
  .omit({ ownerUserId: true })
  .extend({
  id: uuidSchema.optional(),
  status: z.enum(['draft', 'pending', 'active', 'paused', 'expired', 'sold', 'deleted', 'rejected', 'hidden']).optional(),
  year: listingEditYearSchema,
  fuel: listingEditFuelSchema,
  transmission: listingEditTransmissionSchema,
  /** Optional on edit for legacy rows; if either is sent, both must form a valid pair. */
  city: z.string().min(1, 'Orașul este obligatoriu').max(100).optional().nullable(),
  county: z.string().min(1, 'Județul este obligatoriu').max(100).optional().nullable(),
}).strict().superRefine((data, ctx) => {
  if (data.category && !VALID_CATEGORY_LABELS.has(data.category)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Categorie invalidă',
      path: ['category'],
    });
    return;
  }

  const categoryForTaxonomy = data.category;
  if (categoryForTaxonomy) {
    const subRaw = data.subcategory;
    const subProvided = subRaw !== undefined;
    const sub = typeof subRaw === 'string' ? subRaw.trim() : '';
    if (subProvided && isSubcategoryRequired(categoryForTaxonomy)) {
      if (!sub) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subcategoria este obligatorie pentru această categorie',
          path: ['subcategory'],
        });
      } else if (!isValidSubcategory(categoryForTaxonomy, sub)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Subcategoria "${sub}" nu este validă pentru categoria "${categoryForTaxonomy}"`,
          path: ['subcategory'],
        });
      }
    } else if (sub && !isValidSubcategory(categoryForTaxonomy, sub)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Subcategoria "${sub}" nu este validă pentru categoria "${categoryForTaxonomy}"`,
        path: ['subcategory'],
      });
    }

    const incompatible = findIncompatibleAutoTopLevelFields(categoryForTaxonomy, {
      make: data.make,
      model: data.model,
      vin: data.vin,
      year: data.year,
      mileage: data.mileage,
      fuel: data.fuel,
      transmission: data.transmission,
    });
    for (const field of incompatible) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Câmpul "${field}" nu este permis pentru categoria "${categoryForTaxonomy}"`,
        path: [field],
      });
    }

    // Attributes allowlist for PATCH is enforced in the route with effective
    // category/subcategory from the existing listing (see validateListingPatchTaxonomy).
    // Schema-only checks would miss the bypass when subcategory is omitted.
  }

  const county = data.county ?? undefined;
  const city = data.city ?? undefined;
  const countySet = county != null && String(county).trim() !== '';
  const citySet = city != null && String(city).trim() !== '';
  if (countySet || citySet) {
    if (!countySet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Completează județul împreună cu orașul',
        path: ['county'],
      });
    } else if (!citySet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Completează orașul împreună cu județul',
        path: ['city'],
      });
    } else if (!isKnownCounty(String(county))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Județ invalid',
        path: ['county'],
      });
    } else if (!isCityInCounty(String(county), String(city))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Orașul nu aparține județului selectat',
        path: ['city'],
      });
    }
  }

  if (data.category) {
    const makeModel = assertAutoMakeModelPair({
      category: data.category,
      make: data.make,
      model: data.model,
    });
    if (!makeModel.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: makeModel.message,
        path: [makeModel.path],
      });
    }
  }
});

export const listingDeleteSchema = z.object({
  id: uuidSchema,
  reason: z.string().max(500).optional(),
}).strict();

export const listingPromoteSchema = z.object({
  listingId: uuidSchema,
  duration: z.enum(['7days', '30days', '90days']),
  paymentMethod: z.enum(['card', 'transfer', 'subscription']),
}).strict();

/**
 * === MESSAGES ENDPOINTS ===
 */

export const messageSendSchema = z
  .object({
    content: z.string(),
    listingId: z.string().uuid().nullish(),
    conversationId: z.string().uuid().nullish(),
  })
  .strict()
  .transform(({ content, listingId, conversationId }) => ({
    content:
      typeof content === "string" ? content.trim().replace(/\s+/g, " ") : content,
    listingId: listingId ?? undefined,
    conversationId: conversationId ?? undefined,
  }))
  .refine((o) => o.content.length >= 1, {
    message: "Message content required",
  })
  .refine((o) => o.content.length <= 5000, {
    message: "Message content is too long",
  });

export const messagingTypingSchema = z
  .object({
    conversationId: uuidSchema,
    typing: z.boolean(),
  })
  .strict();

export const messagingPresenceSchema = z
  .object({
    conversationId: uuidSchema.optional(),
    online: z.boolean(),
  })
  .strict();

/**
 * === REPORTS ENDPOINTS ===
 */

export const reportCreateSchema = z.object({
  listingId: uuidSchema,
  reason: z.enum(['spam', 'fraud', 'illegal', 'copyright', 'inappropriate', 'other']),
  description: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).max(5).default([]).optional(),
}).strict();

export const reportResolveSchema = z.object({
  action: z.enum(['approve', 'dismiss']),
  resolution: z.string().max(1000).optional(),
}).strict();

/**
 * === PAYMENTS ENDPOINTS
 */

export const paymentCreateSchema = z.object({
  listingId: uuidSchema,
  amount: z.coerce.number().min(0.01),
  currency: z.enum(['RON', 'EUR', 'USD']),
  paymentMethod: z.enum(['card', 'transfer', 'wallet']),
  description: z.string().max(500),
}).strict();

export const subscriptionSchema = z.object({
  planId: z.string().min(1),
  duration: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['card', 'transfer']),
}).strict();

/**
 * === ADMIN ENDPOINTS ===
 */

export const adminBanUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(10).max(500),
  duration: z.enum(['permanent', '7days', '30days', '90days']).default('permanent'),
}).strict();

export const adminPromoteSchema = z.object({
  listingId: uuidSchema,
  duration: z.enum(['7days', '30days', '90days']),
}).strict();

export const adminBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
  type: z.enum(['info', 'warning', 'urgent']).default('info'),
  targetUsers: z.enum(['all', 'sellers', 'buyers', 'admins']).default('all'),
  sendEmail: z.boolean().default(true).optional(),
}).strict();

export const adminBulkActionsSchema = z.object({
  action: z.enum(['ban', 'warn', 'approve', 'reject', 'delete']),
  userIds: z.array(uuidSchema).min(1).max(1000),
  reason: z.string().max(500).optional(),
}).strict();

export const adminInvoiceSubmitSchema = z.object({
  invoiceIds: z.array(uuidSchema).min(1).max(100),
}).strict();

/**
 * === USER ENDPOINTS ===
 */

export const userProfileSchema = z.object({
  name: nameSchema.optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  phone: phoneOptionalSchema,
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  website: z.string().url().optional(),
  businessName: z.string().max(200).optional(),
  businessCUI: z.string().max(20).optional(),
}).strict();

export const userBillingDataSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: emailSchema,
  phone: phoneSchema,
  company: z.string().max(200).optional(),
  cui: z.string().regex(/^\d{10}$/).optional(),
  vat: z.string().optional(),
  address: z.string().max(500),
  city: z.string().max(100),
  county: z.string().max(100),
  postalCode: z.string().regex(/^\d{6}$/),
  country: z.string().length(2),
}).strict();

export const userVerifyBusinessSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessCUI: z.string().regex(/^\d{10}$/, 'CUI must be 10 digits'),
  registrationNumber: z.string().max(50).optional(),
}).strict();

/**
 * === IMAGE UPLOAD ENDPOINTS ===
 */

export const imageUploadSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, 'At least 1 file required')
    .max(20, 'Maximum 20 files'),
  purpose: z.enum(['listing', 'avatar', 'document', 'evidence']),
  listingId: uuidSchema.optional(),
}).strict();

export const uploadBase64Schema = z.object({
  filename: z.string().optional(), // Optional - server generates safe filename anyway
  data: z.string().min(1, 'Base64 data required'),
  listingId: listingUploadIdSchema.optional(),
  type: z.enum(['image', 'video']).optional(),
}).strict();

export const imageDeleteSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
}).strict();

/**
 * === SEARCH ENDPOINTS ===
 */

export const searchListingsSchema = z.object({
  userId: z.string().max(50).optional(),
  q: z.string().min(2).max(200).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  county: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  condition: z.string().max(50).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  /** Required when priceMin/priceMax (or aliases) are set — no cross-currency bands. */
  priceCurrency: z.enum(['RON', 'EUR', 'USD']).optional(),
  year: z.coerce.number().int().optional(),
  yearMin: z.coerce.number().int().optional(),
  yearMax: z.coerce.number().int().optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  fuel: z.string().max(50).optional(),
  transmission: z.string().max(50).optional(),
  sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'featured', 'relevance']).optional(),
  ...paginationSchema.shape,
}).catchall(z.string().max(200));

/**
 * === MODERATION ENDPOINTS ===
 */

export const moderationActionSchema = z.object({
  listingId: uuidSchema,
  action: z.enum(['approve', 'reject', 'review']),
  notes: z.string().max(1000).optional(),
}).strict();

/**
 * === DRAFT ENDPOINTS ===
 */

export const draftCreateSchema = z.object({
  id: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  priceType: z.enum(PRICE_TYPES).optional().nullable(),
  priceAmount: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v === null ? null : v),
    z.union([z.coerce.number().int().min(0).max(99_999_999), z.null()]).optional()
  ),
  priceCurrency: z.enum(['RON', 'EUR', 'USD']).optional().nullable(),
  salaryMin: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v === null ? null : v),
    z.union([z.coerce.number().int().positive().max(99_999_999), z.null()]).optional()
  ),
  salaryMax: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v === null ? null : v),
    z.union([z.coerce.number().int().positive().max(99_999_999), z.null()]).optional()
  ),
  salaryCurrency: z.enum(['RON', 'EUR', 'USD']).optional().nullable(),
  salaryPeriod: z.enum(SALARY_PERIODS).optional().nullable(),
  photos: z.array(listingSubmittedPhotoUrlSchema).max(20).optional(),
  county: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  year: z.coerce.number().int().optional().nullable(),
  mileage: z.coerce.number().int().optional().nullable(),
  fuel: z.string().max(50).optional().nullable(),
  transmission: z.string().max(50).optional().nullable(),
  isDealer: z.boolean().optional(),
  dealerBrands: z.array(z.string()).optional(),
  dealerPriceMin: z.coerce.number().optional().nullable(),
  dealerPriceMax: z.coerce.number().optional().nullable(),
}).strict();

/**
 * Utility function: Safely parse and validate request body
 */
export async function parseAndValidate<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: 'Invalid JSON in request body',
    };
  }
}

/**
 * Utility function: Safely parse query parameters
 */
export function parseAndValidateQuery<T>(
  params: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const obj = Object.fromEntries(params);
    const result = schema.safeParse(obj);
    
    if (!result.success) {
      const errors = result.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: 'Invalid query parameters',
    };
  }
}
