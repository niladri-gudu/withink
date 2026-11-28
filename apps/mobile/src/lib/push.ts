import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createDiaryClient } from '@/lib/api';

const TOKEN_KEY = 'withink.push-token';

export type PushRegistration = 'registered' | 'unsupported' | 'denied';

/** EAS project id — required by `getExpoPushTokenAsync`. */
function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

/**
 * Registers this install's Expo push token with the server. Returns
 * `unsupported` when the build has no EAS project id (token requests throw) or
 * the runtime is not a physical device, so the UI can explain instead of
 * failing. Safe to call repeatedly: the server upserts by token.
 */
export async function ensurePushRegistration(): Promise<PushRegistration> {
  if (!Device.isDevice) return 'unsupported';

  const id = projectId();
  if (!id) return 'unsupported';

  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: id,
  });

  await createDiaryClient().registerPushDevice({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    deviceLabel: Device.modelName ?? undefined,
  });
  await SecureStore.setItemAsync(TOKEN_KEY, token);

  return 'registered';
}

/** Best-effort removal; never throws so sign-out stays dependable. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await createDiaryClient().unregisterPushDevice(token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Offline sign-out still clears the local session; the server prunes
    // tokens reported as DeviceNotRegistered on the next send.
  }
}
