import { MOBILE_CONFIG } from '../config';
import { getFlag } from '../featureFlags';
import { addBreadcrumb, getRequestId, trackError } from '../telemetry';
import type {
  AuthTokens,
  Conversation,
  Listing,
  ListingPayload,
  MessageItem,
  NotificationItem,
  User,
} from '../types';

let accessToken: string | null = null;
let csrfToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }

  const data = await request<{ csrfToken?: string }>('/api/csrf');
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

const request = async <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<T> => {
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

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const error = new Error(data?.error || `HTTP ${response.status}`);
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

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User } & AuthTokens> {
    try {
      const data = await request<any>('/api/auth/mobile-login', {
        method: 'POST',
        body: { email, password },
      });
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch {
      const token = await ensureCsrfToken();
      const data = await request<any>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        headers: { 'x-csrf-token': token },
      });
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    }
  },
  async me(): Promise<User> {
    const data = await request<any>('/api/users/me');
    return data.user ?? data;
  },
};

export const listingsApi = {
  async list(): Promise<Listing[]> {
    const data = await request<any>('/api/listings?status=active');
    return data.listings ?? data.data ?? data;
  },
  async getById(id: string): Promise<Listing> {
    return request<Listing>(`/api/listings/${id}`);
  },
  async my(): Promise<Listing[]> {
    const data = await request<any>('/api/listings?userId=me&status=all');
    return data.listings ?? data.data ?? data;
  },
  async create(payload: ListingPayload): Promise<Listing> {
    const token = await ensureCsrfToken();
    const data = await request<any>('/api/listings', {
      method: 'POST',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
    return data.listing ?? data;
  },
  async update(id: string, payload: Partial<ListingPayload>): Promise<Listing> {
    const token = await ensureCsrfToken();
    const data = await request<Listing>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: payload,
      headers: { 'x-csrf-token': token },
    });
    return data;
  },
};

export const favoritesApi = {
  async list(): Promise<Listing[]> {
    const data = await request<any>('/api/favorites');
    return data.favorites ?? data.listings ?? data.data ?? [];
  },
};

export const messagesApi = {
  async conversations(): Promise<Conversation[]> {
    const data = await request<any>('/api/messages/conversations');
    const conversations = data.conversations ?? data.data ?? data ?? [];
    return conversations.map((item: any) => ({
      id: item.id,
      participantId: item.otherParticipant?.id,
      participantName: item.otherParticipant?.name || item.otherParticipant?.businessName || 'Conversație',
      participantAvatar: item.otherParticipant?.avatar,
      listingId: item.listing?.id,
      listingTitle: item.listing?.title,
      lastMessage: item.lastMessage?.content || null,
      unreadCount: item.unreadCount || 0,
      updatedAt: item.lastMessageAt || item.createdAt,
    }));
  },
  async thread(userId: string, params?: { listingId?: string; conversationId?: string }): Promise<MessageItem[]> {
    const query = new URLSearchParams();
    if (params?.listingId) query.set('listingId', params.listingId);
    if (params?.conversationId) query.set('conversationId', params.conversationId);
    const queryString = query.toString();
    const data = await request<any>(`/api/messages/${userId}${queryString ? `?${queryString}` : ''}`);
    return (data ?? []).map((item: any) => ({
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
    const data = await request<any>('/api/notifications?limit=25&offset=0');
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
    const data = await request<any>('/api/uploads', {
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