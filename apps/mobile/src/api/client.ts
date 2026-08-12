import * as SecureStore from 'expo-secure-store';
import type {
  ConversationListItemDto,
  FavoriteWithListingDto,
  MessageThreadRowDto,
  OwnerAdminListingDto,
  PublicListingDto,
} from '@clickanunt/api-contracts';
import { MOBILE_CONFIG } from '../config';
import { getFlag } from '../featureFlags';
import { addBreadcrumb, getRequestId, trackError } from '../telemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthTokens,
  Conversation,
  Listing,
  ListingPayload,
  MessageItem,
  NotificationItem,
  User,
} from '../types';
import {
  listingsBrowseQueryString,
  mergeListingsByIdUnique,
  parseListingsHasMore,
  type ListingsFeedParams,
} from './listingsBrowseQuery';
import { createRefreshSingleFlight } from './refreshSingleFlight';
import { safeApiErrorMessage, safeNetworkErrorMessage } from './safeApiError';
import type { MobileRegisterExtendedPayload } from '../auth/register-extended-payload';

export {
  listingsBrowseQueryString,
  mergeListingsByIdUnique,
  parseListingsHasMore,
  type ListingsFeedParams,
};

const ACCESS_TOKEN_KEY = 'clickanunt.accessToken';
const REFRESH_TOKEN_KEY = 'clickanunt.refreshToken';
const LAST_PUSH_TOKEN_KEY = 'clickanunt.lastExpoPushToken';

let accessToken: string | null = null;
let csrfToken: string | null = null;
const sourceByKey = new Map<string, 'network' | 'cache'>();

type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Prevents infinite loop when refreshing session. */
  skipAuthRefresh?: boolean;
};

const cacheKey = (scope: string): string => `mobile.cache.${scope}`;

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = async <T>(key: string, value: T): Promise<void> => {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data: value };
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(envelope));
  } catch {
    /* ignore */
  }
};

const invalidateFavoritesCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(cacheKey('favorites.list'));
  } catch {
    /* ignore */
  }
};

/** Drop all mobile.cache.* keys (logout / cross-user safety). */
export async function clearAllMobileCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith('mobile.cache.'));
    if (mine.length) {
      await AsyncStorage.multiRemove(mine);
    }
  } catch {
    /* ignore */
  }
  sourceByKey.clear();
}

type SessionInvalidListener = () => void;
let sessionInvalidListener: SessionInvalidListener | null = null;

/** AuthContext registers this so hard 401 (after failed refresh) returns to login. */
export function setSessionInvalidListener(listener: SessionInvalidListener | null): void {
  sessionInvalidListener = listener;
}

function notifySessionInvalid(): void {
  try {
    sessionInvalidListener?.();
  } catch {
    /* ignore */
  }
}

async function invalidateListingBrowseAndDetailCaches(listingId?: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const browse = keys.filter((k) => k.startsWith('mobile.cache.listings.browse.'));
    const toRemove = [...browse];
    if (listingId) {
      toRemove.push(cacheKey(`listing.${listingId}`));
    }
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    /* ignore */
  }
  for (const k of [...sourceByKey.keys()]) {
    if (k.startsWith('listings.browse.') || (listingId && k === `listing.${listingId}`)) {
      sourceByKey.delete(k);
    }
  }
}

const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  if (!getFlag('enterprise_cache_offline')) {
    const data = await fetcher();
    sourceByKey.set(key, 'network');
    return data;
  }

  const cached = await readCache<T>(key);
  if (cached) {
    sourceByKey.set(key, 'cache');
    fetcher()
      .then((fresh) => {
        sourceByKey.set(key, 'network');
        writeCache(key, fresh).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }

  try {
    const data = await fetcher();
    sourceByKey.set(key, 'network');
    await writeCache(key, data);
    return data;
  } catch (error) {
    const fallback = await readCache<T>(key);
    if (fallback) {
      sourceByKey.set(key, 'cache');
      return fallback;
    }
    throw error;
  }
};

export const getLastDataSource = (key: string): 'network' | 'cache' | null => sourceByKey.get(key) || null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/** Persist access + refresh (Secure Store) — call after login. */
export async function persistAuthTokens(access: string, refresh: string): Promise<void> {
  setAccessToken(access);
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

/** Clear tokens and CSRF cache — call on logout or hard auth failure. */
export async function clearStoredAuthTokens(): Promise<void> {
  setAccessToken(null);
  csrfToken = null;
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const tryMobileRefresh = createRefreshSingleFlight(async () => {
  const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!rt) {
    return { ok: false as const };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/auth/mobile-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': getRequestId(),
      },
      body: JSON.stringify({ refreshToken: rt }),
      signal: controller.signal,
    });
    let body: { accessToken?: string; refreshToken?: string; error?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      body = {};
    }
    if (!response.ok || !body.accessToken) {
      return { ok: false as const };
    }
    try {
      setAccessToken(body.accessToken);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, body.accessToken);
      if (typeof body.refreshToken === 'string' && body.refreshToken.length > 0) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, body.refreshToken);
      }
      return {
        ok: true as const,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    } catch {
      await clearStoredAuthTokens();
      return { ok: false as const };
    }
  } finally {
    clearTimeout(timer);
  }
});

/** Exported for bootstrap retry when access JWT expired but refresh is valid. */
export async function refreshSession(): Promise<boolean> {
  return tryMobileRefresh();
}

const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }

  const data = await request<{ csrfToken?: string }>('/api/csrf', { skipAuthRefresh: true });
  const token = String(data.csrfToken || '');
  if (!token) {
    throw new Error('Missing CSRF token');
  }
  csrfToken = token;
  return token;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (statusCode: number | null, method: string): boolean => {
  if (method !== 'GET') {
    return false;
  }

  if (statusCode === null) {
    return true;
  }

  return statusCode >= 500 || statusCode === 429;
};

const request = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  const method = options?.method || 'GET';
  const maxRetries = getFlag('enterprise_network_hardening') ? 1 : 0;
  const timeoutMs = getFlag('enterprise_network_hardening') ? 12000 : 15000;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-request-id': getRequestId(),
        ...(options?.headers || {}),
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${MOBILE_CONFIG.siteUrl}${path}`, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        credentials: 'include',
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
      addBreadcrumb(`api:${method}:${path}:${response.status}:${durationMs}ms`, 'network');

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const payload = data as { error?: string; message?: string } | null;

      if (!response.ok) {
        if (
          response.status === 401 &&
          !options?.skipAuthRefresh &&
          path !== '/api/auth/mobile-refresh' &&
          path !== '/api/auth/mobile-login'
        ) {
          const refreshed = await tryMobileRefresh();
          if (refreshed) {
            return request<T>(path, { ...options, skipAuthRefresh: true });
          }
          await clearStoredAuthTokens();
          notifySessionInvalid();
        }

        const error = new Error(safeApiErrorMessage(payload, response.status));
        (error as Error & { status?: number }).status = response.status;

        if (response.status === 429) {
          const retryAfterRaw = response.headers.get('retry-after');
          const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
          if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
            (error as Error & { retryAfterMs?: number }).retryAfterMs = Math.min(
              retryAfterSec * 1000,
              60_000
            );
          }
        }

        const canRetry = attempt < maxRetries && shouldRetry(response.status, method);
        if (!canRetry) {
          throw error;
        }

        const retryAfterMs = (error as Error & { retryAfterMs?: number }).retryAfterMs;
        const backoffMs =
          typeof retryAfterMs === 'number' && retryAfterMs > 0
            ? retryAfterMs
            : 250 * Math.pow(2, attempt);
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      return data as T;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxRetries && shouldRetry(null, method);
      if (!canRetry) {
        await trackError('api_request_failed', error, { method, path, attempt });
        // Preserve HTTP copy from safeApiErrorMessage; remap fetch/abort to Romanian.
        throw new Error(safeNetworkErrorMessage(error));
      }

      const backoffMs = 250 * Math.pow(2, attempt);
      await sleep(backoffMs);
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(safeNetworkErrorMessage(lastError));
};

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User } & AuthTokens> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/auth/mobile-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': getRequestId(),
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        requiresTwoFactor?: boolean;
        user?: User;
        accessToken?: string;
        refreshToken?: string;
        error?: string;
      };
      if (response.status === 206 && data?.requiresTwoFactor) {
        throw new Error(
          'Autentificare cu doi factori necesară. Pentru conturi admin, folosește autentificarea pe site.'
        );
      }
      if (!response.ok) {
        throw new Error(safeApiErrorMessage(data, response.status));
      }
      if (!data.user || !data.accessToken || !data.refreshToken) {
        throw new Error('Răspuns autentificare incomplet');
      }
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * Personal register — POST /api/auth/mobile-register (Bearer tokens, no CSRF).
   * Same fields as mobileRegisterSchema: name, email, password.
   */
  async register(payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: User } & AuthTokens> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/auth/mobile-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': getRequestId(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        user?: User;
        accessToken?: string;
        refreshToken?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(safeApiErrorMessage(data, response.status));
      }
      if (!data.user || !data.accessToken || !data.refreshToken) {
        throw new Error('Răspuns înregistrare incomplet');
      }
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * Business (or extended) register — POST /api/auth/mobile-register-extended.
   * Body must match mobileRegisterExtendedSchema.
   */
  async registerExtended(
    payload: MobileRegisterExtendedPayload
  ): Promise<{ user: User } & AuthTokens> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/auth/mobile-register-extended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': getRequestId(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        user?: User;
        accessToken?: string;
        refreshToken?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(safeApiErrorMessage(data, response.status));
      }
      if (!data.user || !data.accessToken || !data.refreshToken) {
        throw new Error('Răspuns înregistrare incomplet');
      }
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string;
  }): Promise<{ success?: boolean; message?: string }> {
    const token = await ensureCsrfToken();
    return request('/api/auth/change-password', {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },

  async changeEmail(payload: {
    newEmail: string;
    currentPassword: string;
  }): Promise<{ success?: boolean; message?: string }> {
    const token = await ensureCsrfToken();
    return request('/api/auth/change-email', {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },

  async logoutAll(payload: { currentPassword: string }): Promise<{ success?: boolean; message?: string }> {
    const token = await ensureCsrfToken();
    return request('/api/auth/logout-all', {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },

  async me(): Promise<User> {
    const data = await request<Record<string, unknown>>('/api/users/me');
    return (data as { user?: User }).user ?? (data as User);
  },

  async verifyEmail(token: string): Promise<{ success: boolean; alreadyVerified?: boolean; message?: string }> {
    return request('/api/auth/verify-email', {
      method: 'POST',
      body: { token },
      skipAuthRefresh: true,
    });
  },

  async resendVerification(email?: string): Promise<{ success: boolean; message?: string }> {
    return request('/api/auth/resend-verification', {
      method: 'POST',
      body: email ? { email } : {},
    });
  },

  /**
   * Server logout: CSRF + optional mobile refreshToken revoke (cookie path unchanged for web).
   */
  async logout(): Promise<void> {
    try {
      const token = await ensureCsrfToken();
      const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      await request('/api/auth/logout', {
        method: 'POST',
        body: rt ? { refreshToken: rt } : {},
        headers: { 'x-csrf-token': token },
      });
    } catch {
      // offline / 401 — still proceed with local clear
    }
  },
};

export type ListingsBrowsePage = {
  listings: Listing[];
  hasMore: boolean;
  page: number;
  total?: number;
};

export const listingsApi = {
  /**
   * Same pipeline as web ListingsView: GET /api/listings (FTS when `q` is set).
   * Returns pagination meta (`hasMore` / `page` / `total`) from the real API envelope.
   * Page 1 may be cached for offline; later pages always hit the network.
   */
  async browsePage(params: ListingsFeedParams = {}): Promise<ListingsBrowsePage> {
    const page = params.page ?? 1;
    const qs = listingsBrowseQueryString(params);
    const fetchPage = async (): Promise<ListingsBrowsePage> => {
      const data = await request<{
        data?: Listing[];
        listings?: Listing[];
        hasMore?: boolean;
        page?: number;
        total?: number;
        pagination?: { hasMore?: boolean; page?: number; total?: number; pages?: number; limit?: number };
      }>(`/api/listings?${qs}`);
      const listings = data.listings ?? data.data ?? [];
      const hasMore = parseListingsHasMore(data);
      const pageNum =
        typeof data.page === 'number'
          ? data.page
          : typeof data.pagination?.page === 'number'
            ? data.pagination.page
            : page;
      const total =
        typeof data.total === 'number'
          ? data.total
          : typeof data.pagination?.total === 'number'
            ? data.pagination.total
            : undefined;
      return { listings, hasMore, page: pageNum, total };
    };
    if (page === 1) {
      return fetchWithCache(`listings.browse.${qs}`, fetchPage);
    }
    const result = await fetchPage();
    sourceByKey.set(`listings.browse.${qs}`, 'network');
    return result;
  },

  async browseFeed(params: ListingsFeedParams = {}): Promise<Listing[]> {
    const page = await listingsApi.browsePage(params);
    return page.listings;
  },

  async getById(id: string): Promise<Listing> {
    return fetchWithCache(`listing.${id}`, () => request<PublicListingDto | OwnerAdminListingDto>(`/api/listings/${id}`));
  },

  /**
   * Public phone reveal — number is not in the listing DTO.
   * Old app builds that read `contactPhone` from getById will show empty until updated.
   */
  async revealContactPhone(
    id: string
  ): Promise<{ phone: string; telHref: string }> {
    const data = await request<{
      phone?: string;
      telHref?: string;
      error?: string;
      hasPhone?: boolean;
    }>(`/api/listings/${id}/contact-phone`);
    if (!data.phone || !data.telHref) {
      throw new Error(data.error || 'Telefon indisponibil');
    }
    return { phone: data.phone, telHref: data.telHref };
  },

  async my(): Promise<OwnerAdminListingDto[]> {
    const data = await request<{ listings?: OwnerAdminListingDto[]; data?: OwnerAdminListingDto[] }>(
      '/api/listings?userId=me&status=all'
    );
    return data.listings ?? data.data ?? [];
  },
  async create(payload: ListingPayload): Promise<OwnerAdminListingDto> {
    const token = await ensureCsrfToken();
    const data = await request<{ listing?: OwnerAdminListingDto } & OwnerAdminListingDto>(`/api/listings`, {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
    const listing = (data as { listing?: OwnerAdminListingDto }).listing ?? (data as OwnerAdminListingDto);
    await invalidateListingBrowseAndDetailCaches(listing.id);
    return listing;
  },
  async update(id: string, payload: Partial<ListingPayload>): Promise<OwnerAdminListingDto> {
    const token = await ensureCsrfToken();
    const data = await request<OwnerAdminListingDto>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
    await invalidateListingBrowseAndDetailCaches(id);
    return data;
  },
};

export const categoriesApi = {
  async list(): Promise<Array<{ key: string; label: string; count: number }>> {
    const data = await request<{ categories?: Array<{ key: string; label: string; count: number }> }>(
      '/api/categories'
    );
    return data.categories ?? [];
  },
};

export const favoritesApi = {
  async list(): Promise<FavoriteWithListingDto[]> {
    return fetchWithCache('favorites.list', async () => {
      const data = await request<{ favorites: FavoriteWithListingDto[] }>('/api/favorites');
      return data.favorites ?? [];
    });
  },

  async add(listingId: string): Promise<void> {
    const token = await ensureCsrfToken();
    await request('/api/favorites', {
      method: 'POST',
      body: { listingId },
      headers: { 'x-csrf-token': token },
    });
    await invalidateFavoritesCache();
  },

  async remove(listingId: string): Promise<void> {
    const token = await ensureCsrfToken();
    await request(`/api/favorites?listingId=${encodeURIComponent(listingId)}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': token },
    });
    await invalidateFavoritesCache();
  },
};

export const messagesApi = {
  async conversations(): Promise<Conversation[]> {
    const data = await request<ConversationListItemDto[] | { conversations?: ConversationListItemDto[] }>(
      '/api/messages/conversations'
    );
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { conversations?: ConversationListItemDto[] })?.conversations)
        ? (data as { conversations: ConversationListItemDto[] }).conversations
        : [];
    return arr.map((item) => ({
      id: item.id,
      participantId: item.otherParticipant?.id,
      participantName: item.otherParticipant?.name || item.otherParticipant?.email || 'Conversație',
      participantAvatar: item.otherParticipant?.avatar,
      listingId: item.listing?.id,
      listingTitle: item.listing?.title,
      lastMessage: item.lastMessage?.content ?? null,
      unreadCount: item.unreadCount || 0,
      updatedAt: item.lastMessageAt || item.createdAt,
    }));
  },
  async thread(userId: string, params?: { listingId?: string; conversationId?: string }): Promise<MessageItem[]> {
    const query = new URLSearchParams();
    if (params?.listingId) query.set('listingId', params.listingId);
    if (params?.conversationId) query.set('conversationId', params.conversationId);
    const queryString = query.toString();
    type ThreadEnvelope =
      | MessageThreadRowDto[]
      | { messages?: MessageThreadRowDto[] };
    const data = await request<ThreadEnvelope>(
      `/api/messages/${userId}${queryString ? `?${queryString}` : ''}`
    );
    const rows = Array.isArray(data) ? data : (data.messages ?? []);
    return rows.map((item) => ({
      id: item.id,
      content: item.content,
      senderId: item.senderId,
      receiverId: item.receiverId,
      createdAt: item.createdAt,
    }));
  },
  async send(userId: string, payload: { content: string; listingId?: string; conversationId?: string }): Promise<void> {
    const token = await ensureCsrfToken();
    await request(`/api/messages/${userId}`, {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },
};

export const notificationsApi = {
  async list(): Promise<NotificationItem[]> {
    const data = await request<{ notifications?: NotificationItem[] }>('/api/notifications?limit=25&offset=0');
    return data.notifications ?? [];
  },
  async markRead(id: string): Promise<void> {
    const token = await ensureCsrfToken();
    await request(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    });
  },
  async markAllRead(): Promise<void> {
    const token = await ensureCsrfToken();
    await request('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    });
  },
  async registerPushToken(payload: { expoPushToken: string; platform: 'ios' | 'android' | 'web' }): Promise<void> {
    const token = await ensureCsrfToken();
    await request('/api/notifications/push-token', {
      method: 'POST',
      body: {
        expoPushToken: payload.expoPushToken,
        platform: payload.platform,
      },
      headers: { 'x-csrf-token': token },
    });
    try {
      await SecureStore.setItemAsync(LAST_PUSH_TOKEN_KEY, payload.expoPushToken);
    } catch {
      /* ignore */
    }
  },

  /** Best-effort DELETE of the last registered Expo push token for this user. */
  async deactivatePushToken(expoPushToken?: string): Promise<void> {
    let tokenValue = expoPushToken?.trim() || '';
    if (!tokenValue) {
      try {
        tokenValue = (await SecureStore.getItemAsync(LAST_PUSH_TOKEN_KEY)) || '';
      } catch {
        tokenValue = '';
      }
    }
    if (!tokenValue) return;
    try {
      const csrf = await ensureCsrfToken();
      await request('/api/notifications/push-token', {
        method: 'DELETE',
        body: { expoPushToken: tokenValue },
        headers: { 'x-csrf-token': csrf },
      });
    } catch {
      /* best-effort — logout must still clear local auth */
    } finally {
      try {
        await SecureStore.deleteItemAsync(LAST_PUSH_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
  },
};

export type UserProfilePatch = {
  name?: string;
  phone?: string;
  location?: string;
};

export type NotificationPreferencesPatch = {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  newMessages?: boolean;
  priceAlerts?: boolean;
  newsletter?: boolean;
};

export const usersApi = {
  async getMe(): Promise<User & { location?: string; notificationPreferences?: NotificationPreferencesPatch }> {
    return request('/api/users/me');
  },

  async patchMe(payload: UserProfilePatch): Promise<{ user?: User; location?: string }> {
    const token = await ensureCsrfToken();
    return request('/api/users/me', {
      method: 'PATCH',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },

  async patchNotificationPreferences(
    payload: NotificationPreferencesPatch
  ): Promise<{ notifications?: NotificationPreferencesPatch }> {
    const token = await ensureCsrfToken();
    return request('/api/users/me/notification-preferences', {
      method: 'PATCH',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
  },

  async deactivate(confirmText: string): Promise<{ success?: boolean; message?: string }> {
    const token = await ensureCsrfToken();
    return request('/api/users/me/deactivate', {
      method: 'POST',
      body: { confirmText },
      headers: { 'x-csrf-token': token },
    });
  },
};

export const uploadsApi = {
  async uploadBase64(payload: { data: string; type: 'image' | 'video'; listingId?: string }): Promise<string> {
    const token = await ensureCsrfToken();
    const data = await request<{ url?: string }>('/api/uploads', {
      method: 'POST',
      body: {
        data: payload.data,
        type: payload.type,
        listingId: payload.listingId,
      },
      headers: { 'x-csrf-token': token },
    });

    if (!data?.url) {
      throw new Error('Upload failed');
    }

    return String(data.url);
  },
};

export const webUrl = MOBILE_CONFIG.siteUrl;
