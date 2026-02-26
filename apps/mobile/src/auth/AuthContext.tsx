import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authApi, setAccessToken } from '../api/client';
import { registerDeviceForPushNotifications } from '../notifications/push';
import { addBreadcrumb, trackError, trackEvent } from '../telemetry';
import type { User } from '../types';

const ACCESS_TOKEN_KEY = 'clickanunt.accessToken';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
        const me = await authApi.me();
        setUser(me);
        addBreadcrumb('auth_bootstrap_success', 'auth');
      } catch {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        setAccessToken(null);
        setUser(null);
        addBreadcrumb('auth_bootstrap_failed', 'auth');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
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
          setAccessToken(result.accessToken);
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, result.accessToken);
          setUser(result.user);
          await trackEvent('login_success', { userId: result.user.id });
        } catch (error) {
          await trackError('login_fail', error, { email });
          throw error;
        }
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        setAccessToken(null);
        setUser(null);
        addBreadcrumb('logout', 'auth');
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