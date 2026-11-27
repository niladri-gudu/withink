import { Ionicons } from '@expo/vector-icons';
import type { MediaFileView, MediaLibraryResponse, MediaStorageStats } from '@withink/contracts';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  Field,
  Skeleton,
} from '@/components/ui';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { diaryCache } from '@/lib/diary-cache';
import { scrubDocumentJson, scrubHtmlImages } from '@/lib/media-scrub';
import {
  absoluteMediaUrl,
  mediaRequestHeaders,
} from '@/lib/media-upload';
import { describeError, useDiary } from '@/providers/diary-provider';

type Sort = 'newest' | 'oldest' | 'largest' | 'smallest';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'largest', label: 'Largest' },
  { value: 'smallest', label: 'Smallest' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLimit(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}


export function MediaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { masterKey, bumpRevision, refreshLocal, entries } = useDiary();
  const [library, setLibrary] = React.useState<MediaLibraryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<Sort>('newest');
  const [grid, setGrid] = React.useState(true);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MediaFileView | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [scrubNote, setScrubNote] = React.useState<string | null>(null);

  const load = React.useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setLibrary(await createDiaryClient().getMediaLibrary());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const hasLoadedRef = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      // Refresh when the gallery is revisited (e.g. after an editor upload).
      void load(hasLoadedRef.current);
      hasLoadedRef.current = true;
    }, [load]),
  );

  const files = React.useMemo(() => {
    const list = [...(library?.files ?? [])];
    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? list.filter((file) =>
          file.key.toLowerCase().includes(needle),
        )
      : list;
    return filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return (a.lastModified ?? '').localeCompare(b.lastModified ?? '');
        case 'largest':
          return b.size - a.size;
        case 'smallest':
          return a.size - b.size;
        default:
          return (b.lastModified ?? '').localeCompare(a.lastModified ?? '');
      }
    });
  }, [library, search, sort]);

  const stats: MediaStorageStats | null = library?.stats ?? null;
  const active = activeIndex !== null ? files[activeIndex] : null;

  const imageSource = React.useCallback(
    (file: MediaFileView) => ({
      uri: absoluteMediaUrl(file.url),
      headers: mediaRequestHeaders(),
    }),
    [],
  );

  async function deleteFile() {
    if (!deleteTarget || !masterKey) return;
    setDeleteBusy(true);
    setError(null);
    setScrubNote('Checking pages that use this image…');
    try {
      const api = createDiaryClient();
      const timeline = await diaryCache.getLocalTimeline(masterKey);
      const targets = Array.from(
        new Set(
          [deleteTarget.url, absoluteMediaUrl(deleteTarget.url)].filter(Boolean),
        ),
      );
      let scrubbed = 0;

      for (const metadata of timeline) {
        const document = await diaryCache.getLocalEntry(metadata.date, masterKey);
        if (!document) continue;
        const html = document.contentHtml ?? '';
        const jsonText = document.contentJson
          ? JSON.stringify(document.contentJson)
          : '';
        const usesFile = targets.some(
          (needle) => html.includes(needle) || jsonText.includes(needle),
        );
        if (!usesFile) continue;

        setScrubNote(`Updating page ${metadata.date}…`);
        const nextHtml = scrubHtmlImages(html, targets);
        const nextJson = scrubDocumentJson(document.contentJson, targets);

        await diaryCache.saveEntryLocally(
          {
            date: metadata.date,
            title: document.title,
            contentText: document.contentText,
            contentHtml: nextHtml,
            contentJson: nextJson,
            mood: document.mood,
            notebookId: document.notebookId,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
          },
          masterKey,
        );
        scrubbed += 1;
      }

      if (scrubbed > 0) {
        const flush = await diaryCache.flushQueue(masterKey);
        if (flush.failed > 0) {
          throw new Error(
            'Could not update one or more pages. The file was not deleted.',
          );
        }
      }

      setScrubNote('Deleting the file…');
      await api.deleteMedia(deleteTarget.key);
      setNotice(
        scrubbed > 0
          ? `File deleted · ${scrubbed} ${scrubbed === 1 ? 'page' : 'pages'} updated.`
          : 'File deleted.',
      );
      bumpRevision();
      void refreshLocal();
      setDeleteTarget(null);
      setActiveIndex(null);
      await load(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setScrubNote(null);
      setDeleteBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={theme.foreground}
          />
        }
      >
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            07 · Media
          </ThemedText>
          <ThemedText type="subtitle">Diary archives</ThemedText>
        </View>

        <Card style={styles.storage}>
          <View style={styles.storageHead}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {stats ? `${stats.fileCount} ${stats.fileCount === 1 ? 'object' : 'objects'}` : 'Storage'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {stats
                  ? `${formatSize(stats.usedMB * 1024 * 1024)} of ${formatLimit(stats.limitMB)}`
                  : 'Reading usage…'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Refresh media"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => void load(true)}
            >
              <Ionicons
                color={theme.mutedForeground}
                name="refresh-outline"
                size={20}
              />
            </Pressable>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, stats?.percentUsed ?? 0)}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
        </Card>

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

        <View style={styles.toolbar}>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search filenames"
            style={styles.search}
            value={search}
          />
          <Pressable
            accessibilityLabel={grid ? 'List view' : 'Grid view'}
            accessibilityRole="button"
            onPress={() => setGrid((value) => !value)}
            style={[
              styles.viewToggle,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <Ionicons
              color={theme.foreground}
              name={grid ? 'list-outline' : 'grid-outline'}
              size={20}
            />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.chips}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {SORTS.map((option) => (
            <Chip
              key={option.value}
              active={sort === option.value}
              label={option.label}
              onPress={() => setSort(option.value)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.gridWrap}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton height={140} key={index} width="48%" />
            ))}
          </View>
        ) : files.length === 0 ? (
          <EmptyState
            title={search ? 'No memories found' : 'No media yet'}
            body={
              search
                ? 'Nothing matches that filename.'
                : 'Images you add from the editor appear here, encrypted in transit and served only to your signed-in devices.'
            }
          />
        ) : grid ? (
          <View style={styles.gridWrap}>
            {files.map((file, index) => (
              <Pressable
                key={file.key}
                accessibilityRole="button"
                onPress={() => setActiveIndex(index)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Image
                  contentFit="cover"
                  source={imageSource(file)}
                  style={styles.tileImage}
                  transition={150}
                />
                <View style={styles.tileCaption}>
                  <ThemedText type="caption" numberOfLines={1}>
                    {file.key.split('/').pop()}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {formatSize(file.size)}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {files.map((file, index) => (
              <Pressable
                key={file.key}
                accessibilityRole="button"
                onPress={() => setActiveIndex(index)}
                style={({ pressed }) => [
                  styles.listRow,
                  {
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Image
                  contentFit="cover"
                  source={imageSource(file)}
                  style={styles.listThumb}
                />
                <View style={styles.flex}>
                  <ThemedText type="small" numberOfLines={1}>
                    {file.key.split('/').pop()}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {file.lastModified
                      ? new Date(file.lastModified).toLocaleDateString()
                      : '—'}
                  </ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatSize(file.size)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <ThemedText type="caption" themeColor="textSecondary">
          {entries.length} pages reference this archive. Deleting an image first
          removes it from every local page, then from storage.
        </ThemedText>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setActiveIndex(null)}
        transparent
        visible={active !== null}
      >
        <View style={[styles.lightbox, { backgroundColor: 'rgba(0,0,0,0.94)' }]}>
          <View style={[styles.lightboxBar, { paddingTop: insets.top + Spacing.two }]}>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={() => setActiveIndex(null)}
              hitSlop={12}
            >
              <Ionicons color="#ffffff" name="close" size={26} />
            </Pressable>
            <ThemedText type="small" style={{ color: '#ffffff' }}>
              {activeIndex !== null ? `${activeIndex + 1} / ${files.length}` : ''}
            </ThemedText>
            <View style={{ width: 22 }} />
          </View>

          {active ? (
            <Image
              contentFit="contain"
              source={imageSource(active)}
              style={styles.lightboxImage}
            />
          ) : null}

          <View style={styles.lightboxFooter}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {active?.key.split('/').pop()}
              </ThemedText>
              <ThemedText type="caption" style={{ color: '#c9c9c9' }}>
                {active ? formatSize(active.size) : ''}
                {active?.lastModified
                  ? ` · ${new Date(active.lastModified).toLocaleDateString()}`
                  : ''}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Previous image"
              accessibilityRole="button"
              disabled={activeIndex === 0}
              onPress={() =>
                setActiveIndex((index) => Math.max(0, (index ?? 0) - 1))
              }
              hitSlop={12}
            >
              <Ionicons
                color={activeIndex === 0 ? '#555' : '#ffffff'}
                name="chevron-back"
                size={26}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Next image"
              accessibilityRole="button"
              disabled={activeIndex === files.length - 1}
              onPress={() =>
                setActiveIndex((index) =>
                  Math.min(files.length - 1, (index ?? 0) + 1),
                )
              }
              hitSlop={12}
            >
              <Ionicons
                color={activeIndex === files.length - 1 ? '#555' : '#ffffff'}
                name="chevron-forward"
                size={26}
              />
            </Pressable>
            <Button
              label="Delete"
              onPress={() => active && setDeleteTarget(active)}
              variant="destructive"
            />
          </View>
        </View>
      </Modal>

      <ConfirmSheet
        busy={deleteBusy}
        confirmLabel="Delete file"
        destructive
        message={
          scrubNote ??
          'The image is removed from every page that uses it before the file is deleted from storage.'
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void deleteFile()}
        title="Delete this image?"
        visible={deleteTarget !== null}
      />

      {scrubNote && !deleteTarget ? (
        <View style={styles.scrubOverlay}>
          <Card style={styles.scrubCard}>
            <ActivityIndicator color={theme.foreground} />
            <ThemedText type="small">{scrubNote}</ThemedText>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  storage: { gap: Spacing.two },
  storageHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  search: { flex: 1 },
  viewToggle: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: Spacing.two },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: '48%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  tileImage: { width: '100%', aspectRatio: 1, backgroundColor: '#111' },
  tileCaption: { padding: Spacing.two, gap: 2 },
  list: { gap: 0 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listThumb: { width: 44, height: 44, borderRadius: Radii.sm },
  lightbox: { flex: 1, gap: Spacing.two },
  lightboxBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  lightboxImage: { flex: 1 },
  lightboxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  scrubOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scrubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
