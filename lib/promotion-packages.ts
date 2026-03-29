import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearFeatureFlagCache } from "@/lib/featureFlags";
import { PromotionPackage } from "@/lib/stripe";
import { applyUserPromotionDiscountToBaseBani } from "@/lib/promotion-pricing";

export const PROMOTION_PACKAGES_FLAG_KEY = "promotion_packages_config_v1";

export const PROMOTION_UI_IDS = ["top", "urgent", "featured", "refresh"] as const;
export type PromotionUiId = (typeof PROMOTION_UI_IDS)[number];

export type PromotionPackageRow = {
  id: PromotionUiId;
  name: string;
  price: number;
  duration: number;
  enabled: boolean;
  discount: number;
};

/** Aliniat cu PACKAGE_MAPPING din pagina de plată card */
export const UI_PACKAGE_TO_STRIPE: Record<PromotionUiId, PromotionPackage> = {
  top: PromotionPackage.FEATURED_7_DAYS,
  urgent: PromotionPackage.FEATURED_30_DAYS,
  featured: PromotionPackage.FEATURED_7_DAYS,
  refresh: PromotionPackage.TOP_POSITION_1_DAY,
};

/** coerce: unele proxy/client trimit numere ca string în JSON */
export const promotionPackageRowSchema = z.object({
  id: z.enum(["top", "urgent", "featured", "refresh"]),
  name: z.string().min(1).max(120),
  price: z.coerce.number().int().min(0).max(999_999),
  duration: z.coerce.number().int().min(0).max(3650),
  enabled: z.coerce.boolean(),
  discount: z.coerce.number().int().min(0).max(100),
});

export const promotionPackagesPutSchema = z
  .object({
    packages: z.array(promotionPackageRowSchema).length(4),
  })
  .strict()
  .refine((data) => new Set(data.packages.map((p) => p.id)).size === 4, {
    message: "packages must contain exactly one row per id",
  });

export const DEFAULT_PROMOTION_PACKAGES: PromotionPackageRow[] = [
  { id: "top", name: "TOP Anunț", price: 49, duration: 7, enabled: true, discount: 0 },
  { id: "urgent", name: "Anunț URGENT", price: 29, duration: 3, enabled: true, discount: 0 },
  { id: "featured", name: "Anunț Evidențiat", price: 19, duration: 5, enabled: true, discount: 0 },
  { id: "refresh", name: "Reîmprospătare", price: 9, duration: 0, enabled: true, discount: 0 },
];

export function effectivePriceRon(price: number, discountPct: number): number {
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((price * (100 - d)) / 100);
}

export function effectivePriceBani(price: number, discountPct: number): number {
  return Math.max(0, Math.round(effectivePriceRon(price, discountPct) * 100));
}

function normalizeRow(base: PromotionPackageRow, partial: Partial<PromotionPackageRow>): PromotionPackageRow {
  const merged = { ...base, ...partial, id: base.id };
  const r = promotionPackageRowSchema.safeParse(merged);
  return r.success ? r.data : base;
}

function mergeRows(saved: Partial<PromotionPackageRow>[] | null | undefined): PromotionPackageRow[] {
  if (!saved?.length) return [...DEFAULT_PROMOTION_PACKAGES];
  const byId = new Map<PromotionUiId, Partial<PromotionPackageRow>>();
  for (const row of saved) {
    if (row?.id && (PROMOTION_UI_IDS as readonly string[]).includes(row.id)) {
      byId.set(row.id as PromotionUiId, row);
    }
  }
  return DEFAULT_PROMOTION_PACKAGES.map((d) => normalizeRow(d, byId.get(d.id) || {}));
}

export async function getMergedPromotionPackages(): Promise<PromotionPackageRow[]> {
  try {
    const row = await prisma.featureFlag.findUnique({
      where: { key: PROMOTION_PACKAGES_FLAG_KEY },
    });
    if (!row?.description) return [...DEFAULT_PROMOTION_PACKAGES];
    const json = JSON.parse(row.description) as { packages?: Partial<PromotionPackageRow>[] };
    if (!json.packages || !Array.isArray(json.packages)) return [...DEFAULT_PROMOTION_PACKAGES];
    return mergeRows(json.packages);
  } catch {
    return [...DEFAULT_PROMOTION_PACKAGES];
  }
}

export async function savePromotionPackages(packages: PromotionPackageRow[]): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key: PROMOTION_PACKAGES_FLAG_KEY },
    create: {
      key: PROMOTION_PACKAGES_FLAG_KEY,
      enabled: true,
      description: JSON.stringify({ packages }),
    },
    update: {
      enabled: true,
      description: JSON.stringify({ packages }),
      updatedAt: new Date(),
    },
  });
  clearFeatureFlagCache();
}

/** Răspuns public pentru UI promovare (fără discount brut separat — preț afișat deja redus) */
export function toPublicPromotionPackage(row: PromotionPackageRow) {
  return {
    id: row.id,
    name: row.name,
    priceRon: effectivePriceRon(row.price, row.discount),
    durationDays: row.duration,
    enabled: row.enabled,
  };
}

/**
 * Sumă Stripe (bani) pentru pachet UI; verifică consistența cu tipul Stripe trimis de client.
 */
export async function resolvePromotionPaymentBaseBani(
  packageId: string,
  stripePackageType: string
): Promise<{ amount: number } | { error: string }> {
  if (!(PROMOTION_UI_IDS as readonly string[]).includes(packageId)) {
    return { error: "Pachet necunoscut" };
  }
  const uiId = packageId as PromotionUiId;
  const expected = UI_PACKAGE_TO_STRIPE[uiId];
  if (expected !== stripePackageType) {
    return { error: "Tip pachet incorect" };
  }
  const merged = await getMergedPromotionPackages();
  const row = merged.find((p) => p.id === uiId);
  if (!row?.enabled) {
    return { error: "Acest pachet nu este disponibil" };
  }
  const bani = effectivePriceBani(row.price, row.discount);
  if (bani < 100) {
    return { error: "Prețul pachetului este prea mic (minim 1 RON)" };
  }
  return { amount: bani };
}

/** Mapare semantică listare (tip promo + featured); durata zile vine din config admin când e posibil. */
const DEFAULT_LISTING_PROMOTION_SEMANTICS: Record<
  PromotionUiId,
  { promotionType: string; featured: boolean; fallbackDays: number }
> = {
  top: { promotionType: "boost_7days", featured: true, fallbackDays: 7 },
  urgent: { promotionType: "boost_72h", featured: false, fallbackDays: 3 },
  featured: { promotionType: "featured", featured: true, fallbackDays: 5 },
  refresh: { promotionType: "boost_24h", featured: false, fallbackDays: 1 },
};

/**
 * Pentru `featured_7_days` există două pachete UI (top + featured). Fără id salvat în metadata, folosim „featured” ca fallback compatibil vechi.
 */
export function inferUiPackageIdFromStripeType(stripePackageType: string): PromotionUiId | null {
  const matches = PROMOTION_UI_IDS.filter((id) => UI_PACKAGE_TO_STRIPE[id] === stripePackageType);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return "featured";
}

export async function getListingPromotionApplyFromUiPackage(uiId: PromotionUiId): Promise<{
  promotionType: string;
  featured: boolean;
  durationDays: number;
}> {
  const merged = await getMergedPromotionPackages();
  const row = merged.find((p) => p.id === uiId);
  const sem = DEFAULT_LISTING_PROMOTION_SEMANTICS[uiId];
  let durationDays = row?.duration ?? sem.fallbackDays;
  if (uiId === "refresh" && durationDays === 0) durationDays = 1;
  if (durationDays < 1) durationDays = 1;
  return {
    promotionType: sem.promotionType,
    featured: sem.featured,
    durationDays,
  };
}

/** Sumă finală (bani) pentru verificare PayPal/transfer — același algoritm ca la create-intent. */
export async function computeExpectedFinalBaniForUiPackage(
  userId: string,
  packageId: string
): Promise<{ bani: number } | { error: string }> {
  if (!(PROMOTION_UI_IDS as readonly string[]).includes(packageId)) {
    return { error: "Pachet necunoscut" };
  }
  const uiId = packageId as PromotionUiId;
  const stripeType = UI_PACKAGE_TO_STRIPE[uiId];
  const base = await resolvePromotionPaymentBaseBani(packageId, stripeType);
  if ("error" in base) return base;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { promotionDiscountPercent: true },
  });
  const bani = applyUserPromotionDiscountToBaseBani(base.amount, user?.promotionDiscountPercent);
  return { bani };
}
