import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { notificationsApi } from '../api/client';

const getProjectId = (): string | null => {
  const easProjectId =
    (Constants.easConfig as { projectId?: string } | null)?.projectId ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return easProjectId || null;
};

export const registerDeviceForPushNotifications = async (): Promise<void> => {
  if (Constants.appOwnership === 'expo') {
    return;
  }

  if (!Device.isDevice) {
    return;
  }

  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const projectId = getProjectId();
  if (!projectId) {
    return;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;
  if (!expoPushToken) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  await notificationsApi.registerPushToken({
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  });
};
