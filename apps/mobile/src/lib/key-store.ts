import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import { exportKeyToHex, importKeyFromHex, type MasterKey } from "./crypto";

const MASTER_KEY_NAME = "withink.biometric.master";
const ENROLLED_MARKER = "withink.biometric.enrolled";
const PROMPT = "Unlock your diary";

export interface BiometricAvailability {
  available: boolean;
  enrolled: boolean;
  label: string;
}

/**
 * Hardware/biometric capability of this device. `available` means the sensor
 * exists and the user has enrolled a face/fingerprint; the diary key itself is
 * only stored after an explicit in-app opt-in.
 */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware
      ? await LocalAuthentication.isEnrolledAsync()
      : false;
    const types = enrolled
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];
    const label = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    )
      ? "Face ID"
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? "Fingerprint"
        : "Biometrics";
    return { available: hasHardware && enrolled, enrolled, label };
  } catch {
    return { available: false, enrolled: false, label: "Biometrics" };
  }
}

/** True when this install has stored a biometric-wrapped master key. */
export async function hasBiometricKey(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ENROLLED_MARKER)) === "1";
  } catch {
    return false;
  }
}

/**
 * Stores the master key behind the OS biometric/passcode gate. Both write and
 * read use `requireAuthentication`, so the key is unavailable without a fresh
 * device authentication — the app never sees it on a locked device path.
 */
export async function enrollBiometricKey(masterKey: MasterKey): Promise<void> {
  const hex = await exportKeyToHex(masterKey);
  await SecureStore.setItemAsync(MASTER_KEY_NAME, hex, {
    requireAuthentication: true,
    authenticationPrompt: PROMPT,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(ENROLLED_MARKER, "1");
}

/** Reads the enrolled key after the OS prompts for biometrics/passcode. */
export async function loadBiometricKey(): Promise<MasterKey> {
  const hex = await SecureStore.getItemAsync(MASTER_KEY_NAME, {
    requireAuthentication: true,
    authenticationPrompt: PROMPT,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  if (!hex) {
    throw new Error("Biometric unlock is not set up on this device.");
  }
  return importKeyFromHex(hex);
}

/** Removes the enrolled key (sign-out, opt-out, or a failed rotation). */
export async function clearBiometricKey(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(MASTER_KEY_NAME),
    SecureStore.deleteItemAsync(ENROLLED_MARKER),
  ]);
}
