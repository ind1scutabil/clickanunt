/**
 * @jest-environment jsdom
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock('@/lib/security/csrf-client', () => ({
  clearCsrfTokenCache: jest.fn(),
  getCsrfToken: jest.fn().mockResolvedValue('csrf-test'),
}));

jest.mock('@/lib/client-canonical-www', () => ({
  resolveClientApiUrl: (path: string) => path,
}));

import { validateServerAuthSession } from '@/lib/admin-fetch';

describe('validateServerAuthSession', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    localStorage.setItem('accessToken', 'valid-local-jwt');
    localStorage.setItem('user', JSON.stringify({ email: 'a@test.ro', role: 'user' }));
  });

  it('sends Authorization Bearer on GET /api/users/me', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          email: 'a@test.ro',
          role: 'admin',
          name: 'Admin',
        }),
      });

    const result = await validateServerAuthSession();

    expect(result.ok).toBe(true);
    expect(result.user?.role).toBe('admin');

    const meCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('/api/users/me')
    );
    expect(meCall).toBeDefined();
    const init = meCall![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer valid-local-jwt');
    expect(init.credentials).toBe('include');
  });
});
