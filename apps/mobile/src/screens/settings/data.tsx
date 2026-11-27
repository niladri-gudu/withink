import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  ConfirmSheet,
  ListRow,
  SectionLabel,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { diaryCache } from '@/lib/diary-cache';
import { exportAndShare } from '@/lib/export-zip';
import { formatBytes, getLocalCacheBytes } from '@/lib/local-cache';
import { mobileLocalStore } from '@/lib/local-store';
import { describeError, useDiary } from '@/providers/diary-provider';

const LAST_EXPORT_KEY = 'withink.last-export';

export function DataSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    masterKey,
    entries,
    pending,
    syncing,
    syncState,
    syncNotice,
    lastSyncedAt,
    syncNow,
    refreshLocal,
    bumpRevision,
  } = useDiary();

  const [cacheBytes, setCacheBytes] = React.useState(0);
  const [lastExport, setLastExport] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<'export' | 'rebuild' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [rebuildOpen, setRebuildOpen] = React.useState(false);

  const loadLocal = React.useCallback(async () => {
    setCacheBytes(await getLocalCacheBytes());
    try {
      setLastExport(await SecureStore.getItemAsync(LAST_EXPORT_KEY));
    } catch {
      setLastExport(null);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLocal();
  }, [loadLocal, entries.length]);

  async function runExport() {
    setBusy('export');
    setError(null);
    setNotice(null);
    try {
      await exportAndShare();
      const stamp = new Date().toISOString();
      setLastExport(stamp);
      await SecureStore.setItemAsync(LAST_EXPORT_KEY, stamp);
      setNotice('Export prepared and handed to the share sheet.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function rebuild() {
    if (!masterKey) return;
    setBusy('rebuild');
    setError(null);
    setNotice(null);
    try {
      const flush = await diaryCache.flushQueue(masterKey);
      if (flush.failed > 0) {
        throw new Error(
          'Some changes could not sync. Go online and run Sync now before rebuilding the cache.',
        );
      }
      // Clears only entry stores; the local profile (and wrapped key) stays.
      await mobileLocalStore.clearEntries();
      bumpRevision();
      await syncNow();
      await refreshLocal();
      await loadLocal();
      setRebuildOpen(false);
      setNotice('Local cache rebuilt from your encrypted archive.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  const syncLine = syncNotice
    ? syncNotice
    : pending > 0
      ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to sync.`
      : syncState === 'offline'
        ? 'Offline — changes stay safe on this device.'
        : lastSyncedAt
          ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}.`
          : 'Not synced yet.';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to settings"
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons color={theme.foreground} name="chevron-back" size={24} />
          </Pressable>
          <View style={styles.flex}>
            <ThemedText type="label" themeColor="textSecondary">
              Settings · Sync &amp; data
            </ThemedText>
            <ThemedText type="subtitle">Your data, on this device</ThemedText>
          </View>
        </View>

        {notice ? (
          <ThemedText type="small" themeColor="accent">
            {notice}
          </ThemedText>
        ) : null}
        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}

        <SectionLabel>Sync &amp; backup</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="small">{syncLine}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            This account saves directly to the cloud, encrypted on this device
            before anything leaves it.
          </ThemedText>
          <Button
            label="Sync now"
            loading={syncing}
            onPress={() => void syncNow()}
            variant="secondary"
          />
        </Card>

        <SectionLabel>On this device</SectionLabel>
        <Card style={styles.gap}>
          <ListRow
            detail="Encrypted metadata, documents and the pending queue"
            label="Local journal"
            value={formatBytes(cacheBytes)}
          />
          <ListRow
            detail={`${entries.length} ${entries.length === 1 ? 'page' : 'pages'} decrypted only while unlocked`}
            label="Pages cached"
            value={String(entries.length)}
          />
          <ListRow
            detail="Native app storage is not evicted like browser caches"
            label="Eviction protection"
            last
            value="App sandbox"
          />
          <Button
            label="Rebuild local cache"
            onPress={() => setRebuildOpen(true)}
            variant="secondary"
          />
        </Card>

        <SectionLabel>Export</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="caption" themeColor="textSecondary">
            A full-account archive: every page, notebook, letter and media
            manifest in one ZIP. The file leaves the app only through your
            device’s share sheet.
          </ThemedText>
          <ListRow
            detail={
              lastExport
                ? `Last exported ${new Date(lastExport).toLocaleString()}`
                : 'No export taken on this device yet'
            }
            label="Archive download"
            last
          />
          <Button
            label="Export my journal"
            loading={busy === 'export'}
            onPress={() => void runExport()}
            variant="secondary"
          />
        </Card>

        <ThemedText type="caption" themeColor="textSecondary">
          Importing an archive is not available in the native client yet; use
          the web app to restore a Withink ZIP.
        </ThemedText>
      </ScrollView>

      <ConfirmSheet
        busy={busy === 'rebuild'}
        confirmLabel="Rebuild cache"
        message="Unsynced changes are flushed first. If any push fails the rebuild stops. Only the entry stores are cleared — your profile, lock and wrapped key stay on the device."
        onCancel={() => setRebuildOpen(false)}
        onConfirm={() => void rebuild()}
        title="Rebuild the local cache?"
        visible={rebuildOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  gap: { gap: Spacing.two },
});
