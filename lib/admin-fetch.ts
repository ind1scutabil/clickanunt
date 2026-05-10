/**
 * GET/POST admin: Bearer din localStorage + credentials; retry după refresh la 401/403 (token expirat).
 * cache: no-store — evită răspunsuri goale din cache (CDN/browser).
 */
import { clearCsrfTokenCache, getCsrfToken } from '@/lib/security/csrf-client';
import { normalizeJwtInput } from '@/lib/jwt-normalize';

function accessTokenFromBrowserStorage(): string | null {
  if (typeof window === 'undefined') return null;
  const t = normalizeJwtInput(localStorage.getItem('accessToken') || '');
  return t || null;
}

/** Răspunsuri API / proxy care merită încercat refresh token */
export function shouldAttemptTokenRefresh(
  status: number,
  payload: { error?: string } | null,
  rawText: string
): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;
  const err = (payload?.error ?? '').toString().trim();
  /** Autentificat dar fără rol — refresh nu ajută */
  if (err === 'Permisiuni insuficiente') return false;
  if (!err) {
    return /interzis|forbidden|unauthorized|expirat|token/i.test(rawText.slice(0, 500));
  }
  if (err === 'Acces interzis' || err.includes('Acces interzis')) return true;
  return /unauthorized|neautentificat|expirat|token|interzis/i.test(err);
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

async function refreshAccessToken(signal?: AbortSignal): Promise<string | null> {
  /** API-ul /api/auth/refresh acceptă refresh din body SAU din cookie httpOnly */
  const rt =
    typeof window !== 'undefined'
      ? normalizeJwtInput(localStorage.getItem('refreshToken') || '') || null
      : null;
  try {
    const csrfForRefresh = await fetchCsrfTokenFresh();
    const refreshResp = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfForRefresh,
      },
      body: JSON.stringify(rt ? { refreshToken: rt } : {}),
    });
    if (!refreshResp.ok) return null;
    const refreshJson = (await refreshResp.json()) as {
      accessToken?: string;
      user?: Record<string, unknown>;
    };
    const newAccess = refreshJson?.accessToken;
    if (newAccess && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', normalizeJwtInput(newAccess) || newAccess);
      if (refreshJson.user && typeof refreshJson.user === 'object') {
        localStorage.setItem('user', JSON.stringify(refreshJson.user));
      }
      return newAccess;
    }
  } catch {
    /* caller retries with old bearer */
  }
  return null;
}

/**
 * Reîncearcă accessToken din cookie httpOnly (`/api/auth/refresh` cu body gol).
 * Apel recomandat înainte de rute sensibile (ex. listă utilizatori admin).
 */
export async function syncSessionFromCookies(signal?: AbortSignal): Promise<void> {
  await refreshAccessToken(signal);
}

export async function fetchWithAuthRefresh(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  let bearerToken = accessTokenFromBrowserStorage();

  const doFetch = (token: string | null) =>
    fetch(url, {
      ...options,
      credentials: 'include',
      cache: options.cache ?? 'no-store',
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const response = await doFetch(bearerToken);
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

  const newAccess = await refreshAccessToken(options.signal);
  bearerToken =
    newAccess ?? accessTokenFromBrowserStorage();

  const retry = await doFetch(bearerToken);
  if (retry.ok) return retry;
  /** Fără header Authorization — unele instalări trimit cookie valid dar Bearer invalid în SPA */
  return doFetch(null);
}

/** POST JSON + CSRF + Bearer; retry după refresh la 401/403 */
export async function postJsonWithAuthRefresh(
  url: string,
  body: Record<string, unknown>,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  let bearerToken = accessTokenFromBrowserStorage();

  const doPost = async (csrf: string, token: string | null) =>
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      ...options,
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
      body: JSON.stringify(body),
    });

  let csrf = await fetchCsrfTokenFresh();
  const postResponse = await doPost(csrf, bearerToken);
  if (postResponse.ok) return postResponse;

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

  const newAccess = await refreshAccessToken(options.signal);
  if (newAccess) bearerToken = newAccess;
  else bearerToken = accessTokenFromBrowserStorage();

  csrf = await fetchCsrfTokenFresh();
  let retry = await doPost(csrf, bearerToken);
  if (retry.ok) return retry;
  /** Fără Authorization — cookie httpOnly cu access token valid dar Bearer lipsă/invalid în SPA */
  if (bearerToken) {
    retry = await doPost(csrf, null);
  }
  return retry;
}

/** PUT JSON + CSRF + Bearer; retry după refresh la 401/403 */
export async function putJsonWithAuthRefresh(
  url: string,
  body: Record<string, unknown>,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  let bearerToken = accessTokenFromBrowserStorage();

  const doPut = async (csrf: string, token: string | null) =>
    fetch(url, {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      ...options,
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
      body: JSON.stringify(body),
    });

  let csrf = await fetchCsrfTokenFresh();
  const putResponse = await doPut(csrf, bearerToken);
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

  const newAccess = await refreshAccessToken(options.signal);
  if (newAccess) bearerToken = newAccess;
  else bearerToken = accessTokenFromBrowserStorage();

  csrf = await fetchCsrfTokenFresh();
  let retryPut = await doPut(csrf, bearerToken);
  if (retryPut.ok) return retryPut;
  if (bearerToken) {
    retryPut = await doPut(csrf, null);
  }
  return retryPut;
}

/** PATCH / DELETE cu CSRF + refresh la 401/403 */
export async function jsonMutationWithAuthRefresh(
  url: string,
  method: 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<Response> {
  let bearerToken = accessTokenFromBrowserStorage();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const doRequest = async (csrf: string, token: string | null) => {
    const headers: Record<string, string> = {
      'x-csrf-token': csrf,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (method !== 'DELETE' && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
      method,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      headers,
      body: method === 'DELETE' || body === undefined ? undefined : JSON.stringify(body),
    });
  };

  const csrf1 = await fetchCsrfTokenFresh();
  let response = await doRequest(csrf1, bearerToken);

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

  const newAccess = await refreshAccessToken(controller.signal);
  if (newAccess) bearerToken = newAccess;
  else bearerToken = accessTokenFromBrowserStorage();

  const freshCsrf = await fetchCsrfTokenFresh();
  response = await doRequest(freshCsrf, bearerToken);
  clearTimeout(timeoutId);
  return response;
}
