/**
 * Date societate afișate public în pagini legale — din env sau fallback la COMPANY_CONFIG
 * când detaliile legale sunt deja publice (flag existent).
 */
import { COMPANY_CONFIG, isCompanyLegalDetailsPublic } from "@/lib/company-config";

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export type PublicCompanyDetails = {
  name?: string;
  cui?: string;
  registration?: string;
  address?: string;
  country?: string;
};

export function getPublicCompanyDetails(): PublicCompanyDetails {
  const fromEnv: PublicCompanyDetails = {
    name: trimEnv("NEXT_PUBLIC_COMPANY_NAME"),
    cui: trimEnv("NEXT_PUBLIC_COMPANY_CUI"),
    registration: trimEnv("NEXT_PUBLIC_COMPANY_REG"),
    address: trimEnv("NEXT_PUBLIC_COMPANY_ADDRESS"),
    country: trimEnv("NEXT_PUBLIC_COMPANY_COUNTRY"),
  };

  const hasAnyEnv = Object.values(fromEnv).some(Boolean);
  if (hasAnyEnv) return fromEnv;

  if (!isCompanyLegalDetailsPublic()) {
    return {};
  }

  return {
    name: COMPANY_CONFIG.name,
    cui: COMPANY_CONFIG.cui,
    registration: COMPANY_CONFIG.registrationNumber,
    address: COMPANY_CONFIG.address,
    country: COMPANY_CONFIG.country,
  };
}

/**
 * Platform launch date, formatted for display (e.g. "15 martie 2024").
 * Not gated by `isCompanyLegalDetailsPublic()` — it's general "about us" copy,
 * not sensitive legal data. Returns `null` (section hidden) until a real value
 * is set in `COMPANY_CONFIG.platformLaunchDate` or `NEXT_PUBLIC_PLATFORM_LAUNCH_DATE`.
 */
export function getPlatformLaunchDateDisplay(): string | null {
  const raw = trimEnv("NEXT_PUBLIC_PLATFORM_LAUNCH_DATE") ?? COMPANY_CONFIG.platformLaunchDate ?? undefined;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}
