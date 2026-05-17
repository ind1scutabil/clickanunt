import {
  getPasswordRuleFailures,
  meetsPasswordRules,
  PASSWORD_SPECIAL_CHARS_LABEL,
} from '@/lib/security/password-rules';

describe('password-rules', () => {
  it('accepts Test123!', () => {
    expect(meetsPasswordRules('Test123!')).toBe(true);
    expect(getPasswordRuleFailures('Test123!')).toEqual([]);
  });

  it('accepts Test123@ and Test123.', () => {
    expect(meetsPasswordRules('Test123@')).toBe(true);
    expect(meetsPasswordRules('Test123.')).toBe(true);
  });

  it('accepts underscore and hyphen specials', () => {
    expect(meetsPasswordRules('Test123_')).toBe(true);
    expect(meetsPasswordRules('Test123-')).toBe(true);
  });

  it('accepts each displayed special character', () => {
    for (const ch of PASSWORD_SPECIAL_CHARS_LABEL.split('')) {
      const pwd = `Test123${ch}`;
      expect(meetsPasswordRules(pwd)).toBe(true);
    }
  });

  it('rejects password without lowercase', () => {
    expect(meetsPasswordRules('TEST123!')).toBe(false);
    expect(getPasswordRuleFailures('TEST123!')).toContain('lowercase');
  });

  it('rejects password without uppercase', () => {
    expect(meetsPasswordRules('test123!')).toBe(false);
    expect(getPasswordRuleFailures('test123!')).toContain('uppercase');
  });

  it('rejects password without digit', () => {
    expect(meetsPasswordRules('Testtest!')).toBe(false);
    expect(getPasswordRuleFailures('Testtest!')).toContain('digit');
  });

  it('rejects password without special', () => {
    expect(meetsPasswordRules('Test1234')).toBe(false);
    expect(getPasswordRuleFailures('Test1234')).toContain('special');
  });

  it('rejects short passwords', () => {
    expect(meetsPasswordRules('Te1!')).toBe(false);
    expect(getPasswordRuleFailures('Te1!')).toContain('minLength');
  });
});
