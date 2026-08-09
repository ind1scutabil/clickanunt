import {
  classifyAutoFirstSegment,
  resolveAutoMakeFromSlug,
  resolveAutoModelFromSlug,
  resolveAutoCityFromSlug,
  isAutoTaxonomySubcategorySlug,
} from '@/lib/seo/auto-hub-resolve';

describe('auto-hub-resolve', () => {
  it('classifies known city before make', () => {
    expect(classifyAutoFirstSegment('bucuresti')).toBe('city');
    expect(resolveAutoCityFromSlug('cluj-napoca')).toBe('Cluj-Napoca');
  });

  it('resolves BMW make and Seria 7 alias', () => {
    expect(resolveAutoMakeFromSlug('bmw')).toBe('BMW');
    expect(resolveAutoModelFromSlug('BMW', 'seria-7')).toBe('7 Series');
  });

  it('classifies unknown segment', () => {
    expect(classifyAutoFirstSegment('xyz-inexistent')).toBe('unknown');
    expect(resolveAutoMakeFromSlug('xyz-inexistent')).toBeNull();
  });

  it('detects Auto taxonomy subcategory slugs without stealing make/city', () => {
    expect(isAutoTaxonomySubcategorySlug('autoturisme')).toBe(true);
    expect(isAutoTaxonomySubcategorySlug('piese-auto')).toBe(true);
    expect(isAutoTaxonomySubcategorySlug('bmw')).toBe(false);
    expect(isAutoTaxonomySubcategorySlug('cluj-napoca')).toBe(false);
    expect(isAutoTaxonomySubcategorySlug('xyz-inexistent')).toBe(false);
    expect(isAutoTaxonomySubcategorySlug('laptopuri')).toBe(false);
  });
});
