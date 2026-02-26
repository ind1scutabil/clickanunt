import 'react-native-gesture-handler';

import Constants from 'expo-constants';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthContext';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { refreshRemoteFlags } from './src/featureFlags';
import { AppNavigator } from './src/navigation/AppNavigator';
import { addBreadcrumb, trackEvent } from './src/telemetry';

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
          <AppNavigator />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}