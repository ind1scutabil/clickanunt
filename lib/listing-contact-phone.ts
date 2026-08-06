/**
 * Listing contact-phone rules aligned with listingCreateSchema.contactPhone
 * (lib/security/validation-schemas.ts → phoneOptionalSchema).
 *
 * Empty / missing phone is allowed for publish. Non-empty values must match
 * the same pattern as phoneSchema.
 */
const PHONE_RE = /^[0-9+\-\s().]{7,32}$/;

export function normalizeListingContactPhone(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}

export type ListingContactPhoneValidation =
  | { ok: true; value: string | undefined }
  | { ok: false; message: string };

export function validateListingContactPhoneInput(
  raw: string | null | undefined
): ListingContactPhoneValidation {
  const trimmed = normalizeListingContactPhone(raw);
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  if (!PHONE_RE.test(trimmed)) {
    return {
      ok: false,
      message:
        "Numărul de telefon este invalid. Folosește un număr valid (ex. 0712345678).",
    };
  }
  return { ok: true, value: trimmed };
}

/** Map API / Zod phone failures to a human message; null if unrelated. */
export function mapListingPublishPhoneApiError(errorText: string): string | null {
  const raw = String(errorText || "");
  if (!raw.trim()) return null;
  if (!/(contact\s*phone|contactPhone|\btelefon\b|\bphone\b)/i.test(raw)) {
    return null;
  }
  return "Numărul de telefon este invalid. Verifică formatul și încearcă din nou.";
}

export const LISTING_CONTACT_PHONE_OPTIONAL_HINT =
  "Opțional — poți publica și fără telefon; cumpărătorii te pot contacta prin mesaje.";
