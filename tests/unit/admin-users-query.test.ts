/**
 * @jest-environment node
 */

import {
  resolveAdminUsersListLimit,
  resolveAdminUsersOffset,
} from '@/lib/admin/users-query';

describe('admin users query guards', () => {
  it('default limit is 500', () => {
    expect(resolveAdminUsersListLimit(null)).toBe(500);
  });

  it('caps limit at 2000', () => {
    expect(resolveAdminUsersListLimit('99999')).toBe(2000);
  });

  it('offset defaults to 0', () => {
    expect(resolveAdminUsersOffset(null)).toBe(0);
  });
});
