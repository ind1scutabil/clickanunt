/**
 * @jest-environment node
 */

/** Admin soft-delete preserves financial + relational evidence. */

const mockFindFirst = jest.fn();
const mockUpdateMany = jest.fn();
const mockCreateAudit = jest.fn();
const mockGetUser = jest.fn();
const mockValidate = jest.fn();
const mockHasPermission = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    listing: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      updateMany: (...a: unknown[]) => mockUpdateMany(...a),
      delete: jest.fn(() => {
        throw new Error('HARD DELETE MUST NOT BE CALLED');
      }),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getUserFromRequest: (...a: unknown[]) => mockGetUser(...a),
}));

jest.mock('@/lib/rbac', () => ({
  hasPermission: (...a: unknown[]) => mockHasPermission(...a),
  Permission: { LISTINGS_DELETE_ANY: 'LISTINGS_DELETE_ANY' },
}));

jest.mock('@/lib/security/middleware', () => ({
  validateSecureRequest: (...a: unknown[]) => mockValidate(...a),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: (...a: unknown[]) => mockCreateAudit(...a),
}));

jest.mock('@/lib/listing-feed-boost', () => ({
  computeFeedBoost: () => 1,
}));

jest.mock('@/lib/listing-expiry', () => ({
  applyListingPublishExpiryIfMissing: () => ({}),
}));

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/listings/[id]/route';

describe('admin listing DELETE soft-delete', () => {
  const listingId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockHasPermission.mockReturnValue(true);
    mockValidate.mockResolvedValue({
      success: true,
      data: { reason: 'Conținut interzis verificat' },
    });
    mockFindFirst.mockResolvedValue({
      id: listingId,
      title: 'T',
      ownerUserId: 'user-1',
      status: 'active',
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('soft-deletes with reason and never hard-deletes', async () => {
    const req = new NextRequest(`http://localhost/api/admin/listings/${listingId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Conținut interzis verificat' }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: listingId }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.softDeleted).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: listingId, deletedAt: null },
        data: expect.objectContaining({
          status: 'deleted',
          deletedAt: expect.any(Date),
        }),
      })
    );
    expect(mockCreateAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'listing.admin_soft_delete',
        details: expect.objectContaining({ mode: 'soft' }),
      })
    );
  });

  it('rejects without permission', async () => {
    mockHasPermission.mockReturnValue(false);
    const req = new NextRequest(`http://localhost/api/admin/listings/${listingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'x'.repeat(5) }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: listingId }) });
    expect(res.status).toBe(403);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
