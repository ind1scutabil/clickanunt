/**
 * @jest-environment jsdom
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock('@/lib/security/csrf-client', () => ({
  clearCsrfTokenCache: jest.fn(),
  getCsrfToken: jest.fn().mockResolvedValue('csrf-test'),
  fetchCsrfTokenFresh: jest.fn().mockResolvedValue('csrf-test'),
}));

jest.mock('@/lib/client-canonical-www', () => ({
  resolveClientApiUrl: (path: string) => path,
}));

import { validateServerAuthSession } from '@/lib/admin-fetch';

/** Unsigned JWT-shaped token for client expiry heuristics only (not server-verified). */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('validateServerAuthSession', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify({ email: 'a@test.ro', role: 'user' }));
  });

  it('sends Authorization Bearer on GET /api/users/me when access token has future exp', async () => {
    const token = fakeJwt({
      userId: 'u1',
      email: 'a@test.ro',
      role: 'user',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    localStorage.setItem('accessToken', token);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'u1',
        email: 'a@test.ro',
        role: 'admin',
        name: 'Admin',
      }),
    });

    const result = await validateServerAuthSession();

    expect(result.ok).toBe(true);
    expect(result.user?.role).toBe('admin');
    expect(result.user?.id).toBe('u1');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
      id: 'u1',
      email: 'a@test.ro',
      role: 'admin',
    });

    // Future-exp token → refresh skipped → single /me call
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const meCall = mockFetch.mock.calls[0];
    expect(String(meCall[0])).toContain('/api/users/me');
    const init = meCall[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${token}`);
    expect(init.credentials).toBe('include');
  });

  it('attempts refresh when access token is expired before calling /me', async () => {
    const expired = fakeJwt({
      userId: 'u1',
      email: 'a@test.ro',
      role: 'user',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    localStorage.setItem('accessToken', expired);
    localStorage.setItem('refreshToken', 'refresh-token');

    const fresh = fakeJwt({
      userId: 'u1',
      email: 'a@test.ro',
      role: 'user',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: fresh, user: { email: 'a@test.ro', role: 'user' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'u1', email: 'a@test.ro', role: 'user', name: 'U' }),
      });

    const result = await validateServerAuthSession();
    expect(result.ok).toBe(true);
    expect(result.user?.id).toBe('u1');
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/auth/refresh');
    expect(String(mockFetch.mock.calls[1][0])).toContain('/api/users/me');
  });

  it('opaque non-JWT token skips refresh (no exp) then calls /me with Bearer', async () => {
    // Contract of accessTokenNeedsRefresh: unreadable exp → treat as still-valid until 401.
    localStorage.setItem('accessToken', 'opaque-not-a-jwt');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'u1', email: 'a@test.ro', role: 'user', name: 'U' }),
    });

    const result = await validateServerAuthSession();
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/users/me');
  });
});
