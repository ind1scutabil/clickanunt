import {
  TAXONOMY,
  VALID_CATEGORY_LABELS,
  isValidCategory,
  isValidSubcategory,
  validSubcategoryLabelsFor,
  getCategoryDef,
  getCategoryDefBySlug,
  getAttributeDefsFor,
  checkProhibitedContent,
  allSubcategoryLabels,
} from '@/lib/taxonomy';
import { CATEGORIES } from '@/lib/carData';

describe('taxonomy', () => {
  describe('TAXONOMY structure', () => {
    it('has 12 top-level categories', () => {
      expect(TAXONOMY.length).toBe(12);
    });

    it('every category has a label, slug, and at least 1 subcategory', () => {
      for (const cat of TAXONOMY) {
        expect(cat.label.length).toBeGreaterThan(0);
        expect(cat.slug.length).toBeGreaterThan(0);
        expect(cat.subcategories.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('all slugs are unique', () => {
      const slugs = TAXONOMY.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('all subcategory slugs are unique within a category', () => {
      for (const cat of TAXONOMY) {
        const slugs = cat.subcategories.map((s) => s.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    });
  });

  describe('backward compatibility with carData.ts', () => {
    it('every carData category label exists in TAXONOMY', () => {
      for (const label of Object.keys(CATEGORIES)) {
        expect(VALID_CATEGORY_LABELS.has(label)).toBe(true);
      }
    });

    it('every carData subcategory exists in TAXONOMY for its parent', () => {
      for (const [catLabel, subs] of Object.entries(CATEGORIES)) {
        for (const sub of subs) {
          expect(isValidSubcategory(catLabel, sub)).toBe(true);
        }
      }
    });
  });

  describe('isValidCategory', () => {
    it('returns true for known categories', () => {
      expect(isValidCategory('Auto, moto și ambarcațiuni')).toBe(true);
      expect(isValidCategory('Imobiliare')).toBe(true);
      expect(isValidCategory('Altele')).toBe(true);
    });

    it('returns false for unknown categories', () => {
      expect(isValidCategory('Inexistent')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });

  describe('isValidSubcategory', () => {
    it('returns true for valid pair', () => {
      expect(isValidSubcategory('Imobiliare', 'Apartamente de vânzare')).toBe(true);
    });

    it('returns false for invalid pair (right sub, wrong category)', () => {
      expect(isValidSubcategory('Imobiliare', 'Autoturisme')).toBe(false);
    });

    it('returns false for non-existent subcategory', () => {
      expect(isValidSubcategory('Imobiliare', 'Castele')).toBe(false);
    });
  });

  describe('validSubcategoryLabelsFor', () => {
    it('returns subcategory labels for known category', () => {
      const subs = validSubcategoryLabelsFor('Altele');
      expect(subs).toContain('Diverse');
      expect(subs).toContain('Donații');
    });

    it('returns empty array for unknown category', () => {
      expect(validSubcategoryLabelsFor('Inexistent')).toEqual([]);
    });
  });

  describe('getCategoryDef / getCategoryDefBySlug', () => {
    it('looks up by label', () => {
      const def = getCategoryDef('Imobiliare');
      expect(def).toBeDefined();
      expect(def!.slug).toBe('imobiliare');
    });

    it('looks up by slug', () => {
      const def = getCategoryDefBySlug('auto');
      expect(def).toBeDefined();
      expect(def!.label).toBe('Auto, moto și ambarcațiuni');
    });
  });

  describe('getAttributeDefsFor', () => {
    it('returns shared attributes for category without subcategory', () => {
      const attrs = getAttributeDefsFor('Imobiliare');
      expect(attrs.length).toBeGreaterThan(0);
      expect(attrs.some((a) => a.key === 'rooms')).toBe(true);
    });

    it('returns merged shared + sub attributes', () => {
      const attrs = getAttributeDefsFor('Electronice și electrocasnice', 'Telefoane mobile');
      expect(attrs.some((a) => a.key === 'brand')).toBe(true);
      expect(attrs.some((a) => a.key === 'storage_gb')).toBe(true);
    });

    it('returns empty for unknown category', () => {
      expect(getAttributeDefsFor('Inexistent')).toEqual([]);
    });
  });

  describe('checkProhibitedContent', () => {
    it('blocks weapons', () => {
      const result = checkProhibitedContent('Vând pistol', 'pistol airsoft');
      expect(result.blocked).toBe(true);
      expect(result.flags[0].reason).toContain('Arme');
    });

    it('blocks drugs', () => {
      const result = checkProhibitedContent('marijuana de vânzare', '');
      expect(result.blocked).toBe(true);
    });

    it('blocks financial fraud', () => {
      const result = checkProhibitedContent('Vând cont bancar', 'cont bancar cumpăr');
      expect(result.blocked).toBe(true);
    });

    it('flags counterfeit goods (does not block)', () => {
      const result = checkProhibitedContent('Geantă replica Louis Vuitton', '');
      expect(result.blocked).toBe(false);
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.flags[0].severity).toBe('flag');
    });

    it('flags payment fraud indicators', () => {
      const result = checkProhibitedContent('Vând telefon', 'trimite banii înainte prin Western Union');
      expect(result.blocked).toBe(false);
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('passes normal content', () => {
      const result = checkProhibitedContent('Vând iPhone 15 Pro', 'Stare perfectă, garanție');
      expect(result.blocked).toBe(false);
      expect(result.flags.length).toBe(0);
    });

    it('applies category-specific rules for animals', () => {
      const result = checkProhibitedContent('Lupte de câini', 'organizez meciuri', 'Animale de companie');
      expect(result.blocked).toBe(true);
      expect(result.flags.some(f => f.reason.includes('Lupte de animale'))).toBe(true);
    });

    it('does not apply animal rules to other categories', () => {
      const result = checkProhibitedContent('Film despre lupte de câini', 'documentar', 'Electronice și electrocasnice');
      expect(result.blocked).toBe(false);
    });

    it('flags iCloud bypass in Electronice', () => {
      const result = checkProhibitedContent('iPhone deblocat iCloud', 'bypass frp', 'Electronice și electrocasnice');
      expect(result.blocked).toBe(false);
      expect(result.flags.length).toBeGreaterThan(0);
    });
  });

  describe('allSubcategoryLabels', () => {
    it('returns a flat list of all subcategories', () => {
      const all = allSubcategoryLabels();
      expect(all.length).toBeGreaterThan(50);
      expect(all).toContain('Autoturisme');
      expect(all).toContain('Diverse');
    });
  });
});
