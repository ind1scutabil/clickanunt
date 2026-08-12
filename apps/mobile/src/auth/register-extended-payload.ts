/**
 * Pure builder for POST /api/auth/mobile-register-extended body
 * (matches mobileRegisterExtendedSchema — no acceptTerms/CSRF).
 */

export type BusinessCategory =
  | 'auto_dealer'
  | 'real_estate'
  | 'retail'
  | 'services'
  | 'other';

export type MobileRegisterExtendedInput = {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  businessName: string;
  businessCUI: string;
  businessRegCom: string;
  businessPhone: string;
  businessLocation?: string;
  businessEmail?: string;
  businessDescription?: string;
  businessWebsite?: string;
  businessCategory: BusinessCategory;
};

export type MobileRegisterExtendedPayload = {
  email: string;
  password: string;
  confirmPassword?: string;
  accountType: 'business';
  name: string;
  businessName: string;
  businessCUI: string;
  businessRegCom: string;
  businessPhone: string;
  businessLocation?: string;
  businessEmail?: string;
  businessDescription?: string;
  businessWebsite?: string;
  businessCategory: BusinessCategory;
};

export const BUSINESS_CATEGORY_OPTIONS: Array<{ value: BusinessCategory; label: string }> = [
  { value: 'auto_dealer', label: 'Dealer auto' },
  { value: 'real_estate', label: 'Agenție imobiliară' },
  { value: 'retail', label: 'Magazin' },
  { value: 'services', label: 'Servicii' },
  { value: 'other', label: 'Altul' },
];

export function buildMobileRegisterExtendedPayload(
  input: MobileRegisterExtendedInput
): MobileRegisterExtendedPayload {
  const payload: MobileRegisterExtendedPayload = {
    email: input.email.trim(),
    password: input.password,
    accountType: 'business',
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    businessCUI: input.businessCUI.trim(),
    businessRegCom: input.businessRegCom.trim(),
    businessPhone: input.businessPhone.trim(),
    businessCategory: input.businessCategory,
  };
  if (input.confirmPassword !== undefined) {
    payload.confirmPassword = input.confirmPassword;
  }
  const location = input.businessLocation?.trim();
  if (location) payload.businessLocation = location;
  const bizEmail = input.businessEmail?.trim();
  if (bizEmail) payload.businessEmail = bizEmail;
  const desc = input.businessDescription?.trim();
  if (desc) payload.businessDescription = desc;
  const website = input.businessWebsite?.trim();
  if (website) payload.businessWebsite = website;
  return payload;
}
