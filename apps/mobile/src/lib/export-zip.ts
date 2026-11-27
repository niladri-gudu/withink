import { UNLOCK_HEADER_NAME } from '@withink/contracts';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_URL } from './config';
import { getSessionToken } from './auth-client';
import { getUnlockToken } from './session-state';

/** Downloads the account export ZIP and hands it to the system share sheet. */
export async function exportAndShare(): Promise<void> {
  const headers: Record<string, string> = {};
  const session = getSessionToken();
  if (session) headers.Authorization = `Bearer ${session}`;
  const unlock = getUnlockToken();
  if (unlock) headers[UNLOCK_HEADER_NAME] = unlock;

  const response = await fetch(`${API_URL}/api/export`, { headers });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Sign in again to export your journal.'
        : 'The export could not be prepared. Please try again.',
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `withink-export-${stamp}.zip`);
  try {
    if (file.exists) file.delete();
    file.create();
  } catch {
    // An existing file may still be writable; write below decides.
  }
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      UTI: 'com.pkware.zip-archive',
      dialogTitle: 'Withink journal export',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
