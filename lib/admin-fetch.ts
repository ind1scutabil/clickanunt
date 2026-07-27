/**
 * Cookie-first auth client: HttpOnly cookies + credentials:include.
 * Does not read or write access/refresh JWTs in localStorage.
 */
import { clearCsrfTokenCache, getCsrfToken } from '@/lib/security/csrf-client';
import { broadcastAuthSessionChanged } from '@/lib/auth-session-events';
import { resolveClientApiUrl } from '@/lib/client-canonical-www';
import {
  cacheWebUserProfile,
  clearLegacyWebAuthStorage,
} from '@/lib/auth/clear-legacy-web-auth-storage';

export function shouldAttemptTokenRefresh(
  status: number,
  payload: { error?: string } | null,
  rawText: string
): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;
  const err = (payload?.error ?? '').toString().trim();
  if (err === 'Permisiuni insuficiente') return false;
  if (!err) {
    return /interzis|forbidden|unauthorized|expirat|token|revocat/i.test(rawText.slice(0, 500));
  }
  if (err === 'Acces interzis' || err.includes('Acces interzis')) return true;
  return /unauthorized|neautentificat|expirat|token|interzis|revocat/i.test(err);
}

async function fetchCsrfTokenFresh(): Promise<string> {
  clearCsrfTokenCache();
  return Promise.race<string>([
    getCsrfToken(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: CSRF token fetch')), 5000)
    ),
  ]);
}

/** Cookie-based refresh — empty body; server reads httpOnly refreshToken. */
async function refreshAccessTokenCookie(signal?: AbortSignal): Promise<boolean> {
  try {
    const csrfForRefresh = await fetchCsrfTokenFresh();
    const refreshResp = await fetch(resolveClientApiUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfForRefresh,
      },
      body: JSON.stringify({}),
    });
    if (!refreshResp.ok) return false;
    const refreshJson = (await refreshResp.json()) as {
      user?: Record<string, unknown>;
    };
    // Strip legacy JWT mirrors only — keep UI user cache until /me updates it.
    clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });
    if (refreshJson.user && typeof refreshJson.user === 'object') {
      cacheWebUserProfile(
        refreshJson.user as {
          id?: string;
          email?: string;
          role?: string;
          name?: string | null;
        }
      );
    }
    return true;
  } catch {
    return false;
  }
}

export function clearStaleBrowserAuth(): void {
  if (typeof window === 'undefined') return;
  const cleared = clearLegacyWebAuthStorage({ broadcast: false });
  if (cleared) broadcastAuthSessionChanged();
}

export type ValidatedSessionUser = {
  id?: string;
  email?: string;
  role?: string;
  name?: string | null;
};

export type ValidateServerAuthSessionResult = {
  ok: boolean;
  user?: ValidatedSessionUser;
  transient?: boolean;
};

export async function validateServerAuthSession(
  signal?: AbortSignal
): Promise<ValidateServerAuthSessionResult> {
  // Drop legacy JWT mirrors; keep cached user for soft UI until /me confirms.
  clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });

  try {
    let res = await fetch(resolveClientApiUrl('/api/users/me'), {
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
    if (res.status === 401) {
      const refreshed = await refreshAccessTokenCookie(signal);
      if (refreshed) {
        res = await fetch(resolveClientApiUrl('/api/users/me'), {
          credentials: 'include',
          cache: 'no-store',
          signal,
        });
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        clearStaleBrowserAuth();
      }
      return { ok: false };
    }
    const data = (await res.json()) as ValidatedSessionUser & { id?: string; userId?: string };
    if (typeof window !== 'undefined') {
      let previousId: string | undefined;
      try {
        const prevRaw = localStorage.getItem('user');
        if (prevRaw) {
          const prev = JSON.parse(prevRaw) as { id?: string; userId?: string };
          previousId =
            (typeof prev.id === 'string' && prev.id) ||
            (typeof prev.userId === 'string' && prev.userId) ||
            undefined;
        }
      } catch {
        previousId = undefined;
      }
      const resolvedId =
        (typeof data.id === 'string' && data.id) ||
        (typeof data.userId === 'string' && data.userId) ||
        previousId;
      const sessionUser: ValidatedSessionUser = {
        ...(resolvedId ? { id: resolvedId } : {}),
        email: data.email,
        role: data.role,
        name: data.name ?? null,
      };
      const nextUser = JSON.stringify(sessionUser);
      const prevUser = localStorage.getItem('user');
      cacheWebUserProfile(sessionUser);
      if (prevUser !== nextUser) {
        broadcastAuthSessionChanged();
      }
    }
    return {
      ok: true,
      user: {
        id:
          (typeof data.id === 'string' && data.id) ||
          (typeof data.userId === 'string' && data.userId) ||
          undefined,
        email: data.email,
        role: data.role,
        name: data.name ?? null,
      },
    };
  } catch {
    return { ok: false, transient: true };
  }
}

export async function syncSessionFromCookies(signal?: AbortSignal): Promise<boolean> {
  const result = await validateServerAuthSession(signal);
  return result.ok;
}

export async function fetchWithAuthRefresh(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });

  const apiUrl = resolveClientApiUrl(url);

  const doFetch = () =>
    fetch(apiUrl, {
      ...options,
      credentials: 'include',
      cache: options.cache ?? 'no-store',
      headers: {
        ...(options.headers as Record<string, string> | undefined),
      },
    });

  const response = await doFetch();
  if (response.ok) return response;

  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  const firstText = await response.text();
  let firstPayload: { error?: string } | null = null;
  try {
    firstPayload = firstText ? JSON.parse(firstText) : null;
  } catch {
    firstPayload = null;
  }

  if (!shouldAttemptTokenRefresh(response.status, firstPayload, firstText)) {
    return new Response(firstText, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const refreshed = await refreshAccessTokenCookie(options.signal);
  if (!refreshed) {
    clearStaleBrowserAuth();
    return new Response(firstText, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const retry = await doFetch();
  if (retry.status === 401) clearStaleBrowserAuth();
  return retry;
}

export async function postJsonWithAuthRefresh(
  url: string,
  body: Record<string, unknown>,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });
  const apiUrl = resolveClientApiUrl(url);

  const doPost = async (csrf: string) =>
    fetch(apiUrl, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      ...options,
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        ...(options.headers as Record<string, string> | undefined),
      },
      body: JSON.stringify(body),
    });

  let csrf = await fetchCsrfTokenFresh();
  let postResponse = await doPost(csrf);
  if (postResponse.ok) return postResponse;

  if (postResponse.status === 403) {
    const probe = await postResponse.clone().text();
    const csrfSuspect =
      /csrf/i.test(probe) ||
      (/missing|invalid/i.test(probe) && /token/i.test(probe));
    if (csrfSuspect) {
      csrf = await fetchCsrfTokenFresh();
      const second = await doPost(csrf);
      if (second.ok) return second;
      postResponse = second;
    }
  }

  if (postResponse.status !== 401 && postResponse.status !== 403) {
    return postResponse;
  }

  const firstText = await postResponse.text();
  let firstPayload: { error?: string } | null = null;
  try {
    firstPayload = firstText ? JSON.parse(firstText) : null;
  } catch {
    firstPayload = null;
  }

  if (!shouldAttemptTokenRefresh(postResponse.status, firstPayload, firstText)) {
    return new Response(firstText, {
      status: postResponse.status,
      statusText: postResponse.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const refreshed = await refreshAccessTokenCookie(options.signal);
  if (!refreshed) {
    clearStaleBrowserAuth();
    return new Response(firstText, {
      status: postResponse.status,
      statusText: postResponse.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  csrf = await fetchCsrfTokenFresh();
  const retry = await doPost(csrf);
  if (retry.status === 401) clearStaleBrowserAuth();
  return retry;
}

export async function putJsonWithAuthRefresh(
  url: string,
  body: Record<string, unknown>,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });

  const doPut = async (csrf: string) =>
    fetch(url, {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      ...options,
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        ...(options.headers as Record<string, string> | undefined),
      },
      body: JSON.stringify(body),
    });

  let csrf = await fetchCsrfTokenFresh();
  const putResponse = await doPut(csrf);
  if (putResponse.ok) return putResponse;

  if (putResponse.status !== 401 && putResponse.status !== 403) {
    return putResponse;
  }

  const putFirstText = await putResponse.text();
  let firstPayload: { error?: string } | null = null;
  try {
    firstPayload = putFirstText ? JSON.parse(putFirstText) : null;
  } catch {
    firstPayload = null;
  }

  if (!shouldAttemptTokenRefresh(putResponse.status, firstPayload, putFirstText)) {
    return new Response(putFirstText, {
      status: putResponse.status,
      statusText: putResponse.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await refreshAccessTokenCookie(options.signal);
  csrf = await fetchCsrfTokenFresh();
  return doPut(csrf);
}

export async function jsonMutationWithAuthRefresh(
  url: string,
  method: 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<Response> {
  clearLegacyWebAuthStorage({ broadcast: false, clearUser: false });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const doRequest = async (csrf: string) => {
    const headers: Record<string, string> = {
      'x-csrf-token': csrf,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
      method,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  const csrf1 = await fetchCsrfTokenFresh();
  let response = await doRequest(csrf1);

  if (response.ok) {
    clearTimeout(timeoutId);
    return response;
  }

  if (response.status !== 401 && response.status !== 403) {
    clearTimeout(timeoutId);
    return response;
  }

  const firstText = await response.text();
  let firstPayload: { error?: string } | null = null;
  try {
    firstPayload = firstText ? JSON.parse(firstText) : null;
  } catch {
    firstPayload = null;
  }

  if (!shouldAttemptTokenRefresh(response.status, firstPayload, firstText)) {
    clearTimeout(timeoutId);
    return new Response(firstText, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await refreshAccessTokenCookie(controller.signal);
  const freshCsrf = await fetchCsrfTokenFresh();
  response = await doRequest(freshCsrf);
  clearTimeout(timeoutId);
  if (response.status === 401) clearStaleBrowserAuth();
  return response;
}
