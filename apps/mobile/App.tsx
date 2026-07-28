import 'react-native-gesture-handler';

import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { extractEmailVerificationToken } from './src/auth/email-verification-linking';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { refreshRemoteFlags } from './src/featureFlags';
import { AppNavigator } from './src/navigation/AppNavigator';
import { addBreadcrumb, trackEvent } from './src/telemetry';
import { MOBILE_CONFIG } from './src/config';

function EmailVerificationDeepLinkHandler(): null {
  const { verifyEmailToken } = useAuth();

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const token = extractEmailVerificationToken(url);
      if (!token) return;
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
    };

    Linking.getInitialURL()
      .then((url) => handleUrl(url))
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      void handleUrl(event.url);
    });
    return () => sub.remove();
  }, [verifyEmailToken]);

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
    }

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <EmailVerificationDeepLinkHandler />
          <AppNavigator />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}