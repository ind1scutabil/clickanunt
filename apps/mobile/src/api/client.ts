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

const ACCESS_TOKEN_KEY = 'clickanunt.accessToken';
const REFRESH_TOKEN_KEY = 'clickanunt.refreshToken';

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

async function tryMobileRefresh(): Promise<boolean> {
  try {
    const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!rt) {
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${MOBILE_CONFIG.siteUrl}/api/auth/mobile-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': getRequestId(),
      },
      body: JSON.stringify({ refreshToken: rt }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    let body: { accessToken?: string; error?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      body = {};
    }
    if (!response.ok || !body.accessToken) {
      return false;
    }
    setAccessToken(body.accessToken);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, body.accessToken);
    return true;
  } catch {
    return false;
  }
}

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

      const payload = data as { error?: string } | null;

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
        }

        const error = new Error(payload?.error || `HTTP ${response.status}`);
        const canRetry = attempt < maxRetries && shouldRetry(response.status, method);
        if (!canRetry) {
          throw error;
        }

        const backoffMs = 250 * Math.pow(2, attempt);
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
        throw error;
      }

      const backoffMs = 250 * Math.pow(2, attempt);
      await sleep(backoffMs);
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
};

export type ListingsFeedParams = {
  page?: number;
  limit?: number;
  status?: string;
  /** Exact category string from GET /api/categories (DB). */
  category?: string;
  /** Min 2 chars — same FTS pipeline as web `GET /api/listings?q=` */
  q?: string;
  sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'featured';
};

export function listingsBrowseQueryString(params: ListingsFeedParams = {}): string {
  const sp = new URLSearchParams();
  sp.set('status', params.status ?? 'active');
  sp.set('limit', String(params.limit ?? 24));
  sp.set('page', String(params.page ?? 1));
  sp.set('sort', params.sort ?? 'newest');
  if (params.category) {
    sp.set('category', params.category);
  }
  if (params.q && params.q.trim().length >= 2) {
    sp.set('q', params.q.trim());
  }
  return sp.toString();
}

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
        throw new Error(data?.error || `HTTP ${response.status}`);
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
  async me(): Promise<User> {
    const data = await request<Record<string, unknown>>('/api/users/me');
    return (data as { user?: User }).user ?? (data as User);
  },
};

export const listingsApi = {
  /**
   * Same pipeline as web ListingsView: GET /api/listings (FTS when `q` is set).
   */
  async browseFeed(params: ListingsFeedParams = {}): Promise<Listing[]> {
    const qs = listingsBrowseQueryString(params);
    return fetchWithCache(`listings.browse.${qs}`, async () => {
      const data = await request<{ data?: Listing[]; listings?: Listing[] }>(`/api/listings?${qs}`);
      return data.listings ?? data.data ?? [];
    });
  },

  async getById(id: string): Promise<Listing> {
    return fetchWithCache(`listing.${id}`, () => request<PublicListingDto | OwnerAdminListingDto>(`/api/listings/${id}`));
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
    return (data as { listing?: OwnerAdminListingDto }).listing ?? (data as OwnerAdminListingDto);
  },
  async update(id: string, payload: Partial<ListingPayload>): Promise<OwnerAdminListingDto> {
    const token = await ensureCsrfToken();
    const data = await request<OwnerAdminListingDto>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
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
    const arr = await request<ConversationListItemDto[]>('/api/messages/conversations');
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
