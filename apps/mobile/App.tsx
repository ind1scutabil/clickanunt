import 'react-native-gesture-handler';

import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { extractEmailVerificationToken } from './src/auth/email-verification-linking';
import { extractListingIdFromDeepLink } from './src/auth/listing-deep-link';
import {
  consumePendingListingDeepLink,
  storePendingListingDeepLink,
} from './src/auth/pending-listing-deep-link';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { refreshRemoteFlags } from './src/featureFlags';
import { AppNavigator } from './src/navigation/AppNavigator';
import { navigateToListingDetails } from './src/navigation/navigationRef';
import { addBreadcrumb, trackEvent } from './src/telemetry';
import { MOBILE_CONFIG } from './src/config';

export {
  consumePendingListingDeepLink,
  peekPendingListingDeepLink,
  __setPendingListingDeepLinkForTests,
} from './src/auth/pending-listing-deep-link';

function DeepLinkHandlers(): null {
  const { verifyEmailToken, user, isLoading } = useAuth();
  const handledListingForUser = useRef<string | null>(null);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const token = extractEmailVerificationToken(url);
      if (token) {
        try {
          const result = await verifyEmailToken(token);
          Alert.alert(
            'Verificare email',
            result.message ||
              (result.success
                ? 'Email verificat cu succes.'
                : 'Link invalid sau expirat. Deschide pagina web pentru retrimitere.')
          );
        } catch {
          Alert.alert(
            'Verificare email',
            `Nu am putut verifica din aplicație. Deschide linkul în browser: ${MOBILE_CONFIG.siteUrl}/auth/verify-email`
          );
        }
        return;
      }

      const listingId = extractListingIdFromDeepLink(url);
      if (listingId) {
        storePendingListingDeepLink(url, listingId);
        if (user) {
          handledListingForUser.current = listingId;
          setTimeout(() => navigateToListingDetails(listingId), 0);
        }
      }
    };

    Linking.getInitialURL()
      .then((url) => handleUrl(url))
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      void handleUrl(event.url);
    });
    return () => sub.remove();
  }, [verifyEmailToken, user]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      handledListingForUser.current = null;
      return;
    }
    const id = consumePendingListingDeepLink();
    if (!id || handledListingForUser.current === id) return;
    handledListingForUser.current = id;
    // Prefer in-app navigation — custom-scheme openURL fails in Expo Go.
    const tryNav = (attempt: number) => {
      if (navigateToListingDetails(id)) return;
      if (attempt < 10) {
        setTimeout(() => tryNav(attempt + 1), 100);
      }
    };
    setTimeout(() => tryNav(0), 50);
  }, [user, isLoading]);

  return null;
}

export default function App(): React.JSX.Element {
  useEffect(() => {
    refreshRemoteFlags().catch(() => {});
    addBreadcrumb('application_started', 'lifecycle');
    trackEvent('app_open', { platform: Constants.platform?.ios ? 'ios' : 'unknown' }).catch(() => {});

    if (Constants.appOwnership === 'expo') {
      return;
    }

    let active = true;

    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');

      if (!active) {
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch {
      /* expo-notifications unavailable in some runtimes */
    }

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <DeepLinkHandlers />
          <AppNavigator />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
