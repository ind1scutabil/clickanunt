import {
  DEFAULT_LISTING_IMAGE_URL,
  isValidListingPhotoUrl,
  listingPrimaryPhotoSrc,
  normalizeListingPhotosArray,
} from '@/lib/listing-photo-url';
import { sanitizeListingPhotos } from '@/lib/listing-photo-sanitize';

describe('listing photo policy', () => {
  it('preserves valid local upload paths', () => {
    expect(isValidListingPhotoUrl('/uploads/listings/real-id/original/a.jpg')).toBe(true);
    const n = normalizeListingPhotosArray(['/uploads/listings/real-id/original/a.jpg']);
    expect(n).toHaveLength(1);
    expect(n[0]).toMatch(/uploads\/listings\/real-id\/original\/a\.jpg$/);
  });

  it('rejects draft temp paths', () => {
    expect(isValidListingPhotoUrl('/uploads/listings/temp-abc-123/original/x.jpg')).toBe(false);
    expect(
      listingPrimaryPhotoSrc(['https://www.clickanunt.ro/uploads/listings/temp-550e8400-e29b-41d4-a716-446655440000/x.jpg'])
    ).toBe(DEFAULT_LISTING_IMAGE_URL);
  });

  it('rejects blocked external hosts', () => {
    expect(isValidListingPhotoUrl('https://images.unsplash.com/photo-1?w=400')).toBe(false);
    expect(isValidListingPhotoUrl('https://loremflickr.com/320/240/car')).toBe(false);
    expect(listingPrimaryPhotoSrc(['https://picsum.photos/200'])).toBe(DEFAULT_LISTING_IMAGE_URL);
  });

  it('returns default for empty or invalid arrays', () => {
    expect(listingPrimaryPhotoSrc([])).toBe(DEFAULT_LISTING_IMAGE_URL);
    expect(listingPrimaryPhotoSrc(null)).toBe(DEFAULT_LISTING_IMAGE_URL);
    expect(listingPrimaryPhotoSrc([''])).toBe(DEFAULT_LISTING_IMAGE_URL);
  });

  it('sanitizeListingPhotos removes invalid and keeps valid', () => {
    const { kept, removed } = sanitizeListingPhotos([
      '/uploads/listings/x/original/a.jpg',
      'https://images.unsplash.com/photo-1',
      '/uploads/listings/temp-uuid/original/b.jpg',
      'blob:http://localhost/x',
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatch(/uploads\/listings\/x\/original\/a\.jpg$/);
    expect(removed.length).toBe(3);
  });
});
