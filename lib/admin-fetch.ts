/**
 * GET/POST admin: cookie httpOnly first, then Bearer din localStorage; retry după refresh la 401/403.
 * cache: no-store — evită răspunsuri goale din cache (CDN/browser).
 */
import { clearCsrfTokenCache, getCsrfToken } from '@/lib/security/csrf-client';
import { normalizeJwtInput } from '@/lib/jwt-normalize';
import { broadcastAuthSessionChanged } from '@/lib/auth-session-events';
import { resolveClientApiUrl } from '@/lib/client-canonical-www';

function accessTokenFromBrowserStorage(): string | null {
  if (typeof window === 'undefined') return null;
  const t = normalizeJwtInput(localStorage.getItem('accessToken') || '');
  return t || null;
}

/** Decode JWT `exp` client-side (no signature check) → ms epoch, or null if unreadable. */
function jwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the access token is missing or within `skewMs` of expiry. */
function accessTokenNeedsRefresh(token: string | null, skewMs = 60_000): boolean {
  if (!token) return true;
  const expMs = jwtExpiryMs(token);
  // Readable token without exp → trust it and let the reactive 401 path refresh.
  if (expMs == null) return false;
  return Date.now() >= expMs - skewMs;
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

async function refreshAccessToken(
  signal?: AbortSignal,
  opts: { force?: boolean } = {}
): Promise<string | null> {
  // Proactive callers skip the network refresh when a still-valid token exists.
  // Reactive callers (after a confirmed 401) pass { force: true } to always refresh.
  if (!opts.force) {
    const current = accessTokenFromBrowserStorage();
    if (current && !accessTokenNeedsRefresh(current)) {
      return current;
    }
  }
  /** API-ul /api/auth/refresh acceptă refresh din body SAU din cookie httpOnly */
  const rt =
    typeof window !== 'undefined'
      ? normalizeJwtInput(localStorage.getItem('refreshToken') || '') || null
      : null;
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

/** Elimină sesiunea SPA invalidă (localStorage) după 401 confirmat de server. */
export function clearStaleBrowserAuth(): void {
  if (typeof window === 'undefined') return;
  const hadAuth =
    localStorage.getItem('accessToken') !== null ||
    localStorage.getItem('refreshToken') !== null ||
    localStorage.getItem('user') !== null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Only notify listeners when we actually cleared something. For an anonymous
  // visitor (empty storage) a 401 on /api/users/me would otherwise broadcast →
  // the reconcile listener re-fires → infinite loop.
  if (hadAuth) broadcastAuthSessionChanged();
}

export type ValidatedSessionUser = {
  email?: string;
  role?: string;
  name?: string | null;
};

export type ValidateServerAuthSessionResult = {
  ok: boolean;
  user?: ValidatedSessionUser;
  /** Rețea / timeout — nu șterge sesiunea locală */
  transient?: boolean;
};

/**
 * Sincronizează cookie httpOnly + validează sesiunea la server (`GET /api/users/me`).
 * Trimite și Bearer din localStorage ca fallback când cookie-ul httpOnly e expirat.
 */
export async function validateServerAuthSession(
  signal?: AbortSignal
): Promise<ValidateServerAuthSessionResult> {
  await refreshAccessToken(signal);
  const bearer = accessTokenFromBrowserStorage();

  try {
    const res = await fetch(resolveClientApiUrl('/api/users/me'), {
      credentials: 'include',
      cache: 'no-store',
      signal,
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearStaleBrowserAuth();
      }
      return { ok: false };
    }
    const data = (await res.json()) as ValidatedSessionUser & { id?: string };
    if (typeof window !== 'undefined') {
      const nextUser = JSON.stringify({
        email: data.email,
        role: data.role,
        name: data.name ?? null,
      });
      const prevUser = localStorage.getItem('user');
      localStorage.setItem('user', nextUser);
      if (bearer) {
        localStorage.setItem('accessToken', bearer);
      }
      // Only broadcast when the session actually changed. Broadcasting on every
      // successful validate re-triggers the reconcile listener → infinite loop.
      if (prevUser !== nextUser) {
        broadcastAuthSessionChanged();
      }
    }
    return {
      ok: true,
      user: { email: data.email, role: data.role, name: data.name ?? null },
    };
  } catch {
    return { ok: false, transient: true };
  }
}

/**
 * Reîncearcă accessToken din cookie httpOnly (`/api/auth/refresh` cu body gol).
 * Apel recomandat înainte de rute sensibile (ex. publicare anunț, mesaje).
 */
export async function syncSessionFromCookies(signal?: AbortSignal): Promise<boolean> {
  const result = await validateServerAuthSession(signal);
  return result.ok;
}

export async function fetchWithAuthRefresh(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  await refreshAccessToken(options.signal);
  let bearerToken = accessTokenFromBrowserStorage();

  const apiUrl = resolveClientApiUrl(url);

  const doFetch = (token: string | null) =>
    fetch(apiUrl, {
      ...options,
      credentials: 'include',
      cache: options.cache ?? 'no-store',
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const response = await doFetch(null);
  if (response.ok) return response;

  if (response.status !== 401 && response.status !== 403) {
    if (bearerToken) {
      const withBearer = await doFetch(bearerToken);
      if (withBearer.ok) return withBearer;
      return withBearer;
    }
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

  const newAccess = await refreshAccessToken(options.signal, { force: true });
  bearerToken = newAccess ?? accessTokenFromBrowserStorage();

  let retry = await doFetch(bearerToken);
  if (retry.ok) return retry;
  retry = await doFetch(null);
  if (retry.ok) return retry;
  if (retry.status === 401) clearStaleBrowserAuth();
  return retry;
}

/** POST JSON + CSRF; cookie session first, refresh + retry, clear stale auth on final 401 */
export async function postJsonWithAuthRefresh(
  url: string,
  body: Record<string, unknown>,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  await refreshAccessToken(options.signal);
  let bearerToken = accessTokenFromBrowserStorage();

  const apiUrl = resolveClientApiUrl(url);

  const doPost = async (csrf: string, token: string | null) =>
    fetch(apiUrl, {
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
  let postResponse = await doPost(csrf, null);
  if (postResponse.ok) return postResponse;

  if (bearerToken) {
    const withBearer = await doPost(csrf, bearerToken);
    if (withBearer.ok) return withBearer;
    postResponse = withBearer;
  }

  /** Unele sesiuni: hash CSRF și header se desincronizează (tab-uri / cache) — încă o rundă doar cu CSRF proaspăt înainte de refresh JWT. */
  if (postResponse.status === 403) {
    const probe = await postResponse.clone().text();
    const csrfSuspect =
      /csrf/i.test(probe) ||
      (/missing|invalid/i.test(probe) && /token/i.test(probe));
    if (csrfSuspect) {
      csrf = await fetchCsrfTokenFresh();
      let second = await doPost(csrf, null);
      if (second.ok) return second;
      if (bearerToken) {
        second = await doPost(csrf, bearerToken);
        if (second.ok) return second;
      }
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

  const newAccess = await refreshAccessToken(options.signal, { force: true });
  if (newAccess) bearerToken = newAccess;
  else bearerToken = accessTokenFromBrowserStorage();

  csrf = await fetchCsrfTokenFresh();
  let retry = await doPost(csrf, null);
  if (retry.ok) return retry;
  if (bearerToken) {
    retry = await doPost(csrf, bearerToken);
    if (retry.ok) return retry;
    retry = await doPost(csrf, null);
  }
  if (retry.status === 401) clearStaleBrowserAuth();
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

  const newAccess = await refreshAccessToken(options.signal, { force: true });
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

  const newAccess = await refreshAccessToken(controller.signal, { force: true });
  if (newAccess) bearerToken = newAccess;
  else bearerToken = accessTokenFromBrowserStorage();

  const freshCsrf = await fetchCsrfTokenFresh();
  response = await doRequest(freshCsrf, bearerToken);
  clearTimeout(timeoutId);
  return response;
}
