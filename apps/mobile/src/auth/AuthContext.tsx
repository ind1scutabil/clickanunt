import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  authApi,
  clearAllMobileCaches,
  clearStoredAuthTokens,
  notificationsApi,
  persistAuthTokens,
  refreshSession,
  setAccessToken,
  setSessionInvalidListener,
} from '../api/client';
import type { MobileRegisterExtendedPayload } from './register-extended-payload';
import { registerDeviceForPushNotifications } from '../notifications/push';
import { addBreadcrumb, trackError, trackEvent } from '../telemetry';
import type { User } from '../types';

const ACCESS_TOKEN_KEY = 'clickanunt.accessToken';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  registerExtended: (payload: MobileRegisterExtendedPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmailToken: (token: string) => Promise<{ success: boolean; message?: string }>;
  resendVerification: () => Promise<{ success: boolean; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      addBreadcrumb('auth_bootstrap_started', 'auth');
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!token) {
          addBreadcrumb('auth_bootstrap_no_token', 'auth');
          setIsLoading(false);
          return;
        }

        setAccessToken(token);
        try {
          const me = await authApi.me();
          setUser(me);
          addBreadcrumb('auth_bootstrap_success', 'auth');
        } catch {
          const refreshed = await refreshSession();
          if (refreshed) {
            const me = await authApi.me();
            setUser(me);
            addBreadcrumb('auth_bootstrap_refresh_ok', 'auth');
          } else {
            await clearStoredAuthTokens();
            setUser(null);
            addBreadcrumb('auth_bootstrap_failed', 'auth');
          }
        }
      } catch {
        await clearStoredAuthTokens();
        setUser(null);
        addBreadcrumb('auth_bootstrap_failed', 'auth');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    setSessionInvalidListener(() => {
      setUser(null);
      addBreadcrumb('session_invalidated', 'auth');
    });
    return () => setSessionInvalidListener(null);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    registerDeviceForPushNotifications().catch(() => {
      // Push registration should not block app usage
    });
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email: string, password: string) => {
        addBreadcrumb('login_attempt', 'auth');
        try {
          const result = await authApi.login(email, password);
          if (!result.refreshToken) {
            throw new Error('Răspuns autentificare incomplet');
          }
          await persistAuthTokens(result.accessToken, result.refreshToken);
          setUser(result.user);
          await trackEvent('login_success', { userId: result.user.id });
        } catch (error) {
          await trackError('login_fail', error, { email });
          throw error;
        }
      },
      register: async (payload) => {
        addBreadcrumb('register_attempt', 'auth');
        try {
          const result = await authApi.register(payload);
          if (!result.accessToken || !result.refreshToken) {
            throw new Error('Răspuns înregistrare incomplet');
          }
          await persistAuthTokens(result.accessToken, result.refreshToken);
          setUser(result.user);
          await trackEvent('register_success', { userId: result.user.id });
        } catch (error) {
          await trackError('register_fail', error, { email: payload.email });
          throw error;
        }
      },
      registerExtended: async (payload) => {
        addBreadcrumb('register_extended_attempt', 'auth');
        try {
          const result = await authApi.registerExtended(payload);
          if (!result.accessToken || !result.refreshToken) {
            throw new Error('Răspuns înregistrare incomplet');
          }
          await persistAuthTokens(result.accessToken, result.refreshToken);
          setUser(result.user);
          await trackEvent('register_extended_success', {
            userId: result.user.id,
            accountType: payload.accountType,
          });
        } catch (error) {
          await trackError('register_extended_fail', error, { email: payload.email });
          throw error;
        }
      },
      logout: async () => {
        try {
          await notificationsApi.deactivatePushToken();
        } catch {
          /* best-effort before token clear */
        }
        try {
          await authApi.logout();
        } catch {
          // offline / network — local clear still required
        }
        await clearStoredAuthTokens();
        await clearAllMobileCaches();
        setUser(null);
        addBreadcrumb('logout', 'auth');
      },
      refreshUser: async () => {
        const me = await authApi.me();
        setUser(me);
      },
      verifyEmailToken: async (token: string) => {
        const result = await authApi.verifyEmail(token);
        try {
          const me = await authApi.me();
          setUser(me);
        } catch {
          /* may be logged out */
        }
        return {
          success: Boolean(result.success),
          message: result.message,
        };
      },
      resendVerification: async () => {
        const result = await authApi.resendVerification();
        return {
          success: Boolean(result.success),
          message: result.message,
        };
      },
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
