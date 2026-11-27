import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'withink.db';

/**
 * Approximate size of the encrypted local journal (metadata, documents and
 * the pending queue) in bytes. Used by Settings → On this device.
 */
export async function getLocalCacheBytes(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const row = await db.getFirstAsync<{ bytes: number }>(
      "SELECT COALESCE(SUM(LENGTH(value)), 0) AS bytes FROM local_kv WHERE store IN ('metadata', 'document', 'sync_queue')",
    );
    return row?.bytes ?? 0;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
