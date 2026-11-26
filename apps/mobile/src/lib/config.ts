/**
 * API origin for the Expo client.
 *
 * Android over USB uses `adb reverse tcp:3000 tcp:3000`, so localhost reaches
 * the Next.js dev server. Production builds set EXPO_PUBLIC_API_URL.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const APP_SCHEME = "withink";
