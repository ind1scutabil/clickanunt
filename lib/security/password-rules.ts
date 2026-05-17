/**
 * Single source of truth for password rules (register / reset).
 * Must stay aligned with `passwordSchema` in validation-schemas.ts.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Shown in UI — only these specials satisfy validation. */
export const PASSWORD_SPECIAL_CHARS_LABEL = '!@#$%^&*';

export const PASSWORD_UPPERCASE_RE = /[A-Z]/;
export const PASSWORD_LOWERCASE_RE = /[a-z]/;
export const PASSWORD_DIGIT_RE = /\d/;
export const PASSWORD_SPECIAL_RE = /[!@#$%^&*]/;

export type PasswordRuleKey = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'special';

export const PASSWORD_RULE_LABELS: Record<PasswordRuleKey, string> = {
  minLength: `minim ${PASSWORD_MIN_LENGTH} caractere`,
  uppercase: 'o literă mare',
  lowercase: 'o literă mică',
  digit: 'o cifră',
  special: `un simbol din ${PASSWORD_SPECIAL_CHARS_LABEL}`,
};

export function getPasswordRuleFailures(password: string): PasswordRuleKey[] {
  const out: PasswordRuleKey[] = [];
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    out.push('minLength');
  }
  if (!PASSWORD_UPPERCASE_RE.test(password)) out.push('uppercase');
  if (!PASSWORD_LOWERCASE_RE.test(password)) out.push('lowercase');
  if (!PASSWORD_DIGIT_RE.test(password)) out.push('digit');
  if (!PASSWORD_SPECIAL_RE.test(password)) out.push('special');
  return out;
}

export function meetsPasswordRules(password: string): boolean {
  return getPasswordRuleFailures(password).length === 0;
}

export function formatPasswordRuleFailures(keys: PasswordRuleKey[]): string {
  if (keys.length === 0) return '';
  return keys.map((k) => PASSWORD_RULE_LABELS[k]).join(', ');
}
