import { Ionicons } from '@expo/vector-icons';
import {
  ENTITLEMENTS,
  backfillWindowStart,
  computeCurrentStreak,
  filterLocalTimeline,
  formatDisplayDate,
  getLocalDateString,
  type LocalTimelineFilters,
} from '@withink/core';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  Field,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { diaryCache } from '@/lib/diary-cache';
import { describeError, useDiary } from '@/providers/diary-provider';

const PAGE_SIZE = 5;
const MOODS = [
  { value: 1, label: 'Angry' },
  { value: 2, label: 'Sad' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Happy' },
  { value: 5, label: 'Radiant' },
] as const;

type TimeFilter = NonNullable<LocalTimelineFilters['timeFilter']>;

export function ArchiveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ notebook?: string }>();
  const {
    entries,
    notebooks,
    plan,
    masterKey,
    loadingData,
    syncing,
    syncNow,
    refreshLocal,
    bumpRevision,
  } = useDiary();

  const today = getLocalDateString();
  const [search, setSearch] = React.useState('');
  const [mood, setMood] = React.useState<number | 'all'>('all');
  const [time, setTime] = React.useState<TimeFilter>('all');
  const [notebookFilter, setNotebookFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [moveTarget, setMoveTarget] = React.useState<string | null>(null);
  const [sealedOpen, setSealedOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [monthCursor, setMonthCursor] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  React.useEffect(() => {
    if (params.notebook && notebooks.some((item) => item.id === params.notebook)) {
      // Reflect the deep-linked notebook filter in local UI state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotebookFilter(params.notebook);
      setPage(0);
    }
  }, [params.notebook, notebooks]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshLocal();
    }, [refreshLocal]),
  );

  const filtered = React.useMemo(
    () =>
      filterLocalTimeline(entries, {
        moodFilter: mood,
        timeFilter: time,
        search,
        notebookFilter: notebookFilter === 'all' ? undefined : notebookFilter,
        localToday: today,
      }),
    [entries, mood, time, search, notebookFilter, today],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const entryDates = new Set(entries.map((entry) => entry.date));
  const moodByDate = new Map(
    entries.map((entry) => [entry.date, entry.mood] as const),
  );
  const streak = computeCurrentStreak(
    entries.map((entry) => entry.date),
    today,
  );
  const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);
  const averageWords =
    entries.length > 0 ? Math.round(totalWords / entries.length) : 0;
  const notebookNames = new Map(notebooks.map((item) => [item.id, item.name]));
  const activeFilters =
    (mood === 'all' ? 0 : 1) +
    (time === 'all' ? 0 : 1) +
    (notebookFilter === 'all' ? 0 : 1);

  function resetPage() {
    setPage(0);
  }

  function openDate(date: string) {
    if (date > today) return;
    const earliest = backfillWindowStart(
      today,
      ENTITLEMENTS[plan].backfillDays,
    );
    if (!entryDates.has(date) && earliest !== null && date < earliest) {
      setSealedOpen(true);
      return;
    }
    router.push({ pathname: '/entries/[date]', params: { date } });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setNotice(null);
    try {
      await diaryCache.deleteEntry(deleteTarget);
      bumpRevision();
      await refreshLocal();
      setDeleteTarget(null);
      setPage(0);
    } catch (error) {
      setNotice(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirmMove(notebookId: string) {
    if (!moveTarget || !masterKey) return;
    setBusy(true);
    setNotice(null);
    try {
      const api = createDiaryClient();
      await api.moveEntryToNotebook(moveTarget, notebookId);
      const [payload] = await api.getEntries([moveTarget]);
      if (payload) await diaryCache.ingestEntry(payload, masterKey);
      bumpRevision();
      await refreshLocal();
      setMoveTarget(null);
    } catch (error) {
      setNotice(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={() => void syncNow()}
            refreshing={syncing}
            tintColor={theme.foreground}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            The archive
          </ThemedText>
          <ThemedText type="subtitle">Every page you kept</ThemedText>
          <View style={styles.statsRow}>
            <Stat label="Streak" value={`${streak}d`} />
            <Stat label="Entries" value={String(entries.length)} />
            <Stat label="Avg words" value={String(averageWords)} />
          </View>
        </View>

        <View style={styles.searchRow}>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setSearch(value);
              resetPage();
            }}
            placeholder="Search reflections"
            style={styles.searchInput}
            value={search}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.filterButton,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons color={theme.foreground} name="options-outline" size={20} />
            {activeFilters > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.accentForeground }}
                >
                  {activeFilters}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Card style={styles.calendarCard}>
          <View style={styles.calendarHead}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={() => {
                setMonthCursor(({ year, month }) =>
                  month === 0
                    ? { year: year - 1, month: 11 }
                    : { year, month: month - 1 },
                );
              }}
              hitSlop={10}
            >
              <Ionicons
                color={theme.mutedForeground}
                name="chevron-back"
                size={18}
              />
            </Pressable>
            <ThemedText type="smallBold">
              {new Date(monthCursor.year, monthCursor.month, 1).toLocaleDateString(
                'en-US',
                { month: 'long', year: 'numeric' },
              )}
            </ThemedText>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              onPress={() => {
                setMonthCursor(({ year, month }) =>
                  month === 11
                    ? { year: year + 1, month: 0 }
                    : { year, month: month + 1 },
                );
              }}
              hitSlop={10}
            >
              <Ionicons
                color={theme.mutedForeground}
                name="chevron-forward"
                size={18}
              />
            </Pressable>
          </View>
          <CalendarGrid
            entryDates={entryDates}
            moodByDate={moodByDate}
            month={monthCursor.month}
            onPick={openDate}
            today={today}
            year={monthCursor.year}
          />
        </Card>

        {notice ? (
          <ThemedText type="small" themeColor="destructive">
            {notice}
          </ThemedText>
        ) : null}

        {loadingData && entries.length === 0 ? (
          <View style={styles.skeletonList}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : pageRows.length === 0 ? (
          <EmptyState
            title={search ? 'No matching reflections' : 'Nothing here yet'}
            body={
              search
                ? 'Try a different word, mood or range.'
                : 'Write today’s page and the index starts itself.'
            }
            action={
              !search ? (
                <Button
                  label="Write today's entry"
                  onPress={() =>
                    router.push({
                      pathname: '/entries/[date]',
                      params: { date: today },
                    })
                  }
                  variant="secondary"
                />
              ) : undefined
            }
          />
        ) : (
          pageRows.map((entry) => {
            const notebookName = entry.notebookId
              ? notebookNames.get(entry.notebookId)
              : undefined;
            return (
              <View
                key={entry.date}
                style={[styles.entryRow, { borderBottomColor: theme.border }]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openDate(entry.date)}
                  style={({ pressed }) => [
                    styles.entryMain,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <View style={styles.entryText}>
                    <View style={styles.entryTitleRow}>
                      {entry.mood ? (
                        <View
                          style={[
                            styles.moodDot,
                            {
                              backgroundColor:
                                theme.mood[
                                  Math.min(5, Math.max(1, entry.mood)) as
                                    | 1
                                    | 2
                                    | 3
                                    | 4
                                    | 5
                                ].solid,
                            },
                          ]}
                        />
                      ) : null}
                      <ThemedText numberOfLines={1} style={styles.entryTitle}>
                        {entry.title || 'Untitled Entry'}
                      </ThemedText>
                    </View>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatDisplayDate(entry.date, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      · {entry.wordCount}{' '}
                      {entry.wordCount === 1 ? 'word' : 'words'}
                      {notebooks.length > 1 && notebookFilter === 'all' && notebookName
                        ? ` · ${notebookName}`
                        : ''}
                    </ThemedText>
                    <ThemedText
                      numberOfLines={2}
                      type="small"
                      themeColor="textSecondary"
                    >
                      {entry.snippet || 'This entry is waiting for your next reflection.'}
                    </ThemedText>
                  </View>
                </Pressable>
                {notebooks.length > 1 ? (
                  <Pressable
                    accessibilityLabel="Move to notebook"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setMoveTarget(entry.date)}
                  >
                    <Ionicons
                      color={theme.mutedForeground}
                      name="folder-outline"
                      size={18}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Delete entry"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setDeleteTarget(entry.date)}
                >
                  <Ionicons
                    color={theme.destructive}
                    name="trash-outline"
                    size={18}
                  />
                </Pressable>
              </View>
            );
          })
        )}

        {totalPages > 1 ? (
          <View style={styles.pager}>
            <Button
              disabled={safePage === 0}
              label="Previous"
              onPress={() => setPage(Math.max(0, safePage - 1))}
              variant="secondary"
            />
            <ThemedText type="caption" themeColor="textSecondary">
              Page {safePage + 1} of {totalPages}
            </ThemedText>
            <Button
              disabled={safePage >= totalPages - 1}
              label="Next"
              onPress={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              variant="secondary"
            />
          </View>
        ) : null}

        <View style={{ height: Spacing.five }} />
      </ScrollView>

      <Sheet
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        visible={filtersOpen}
      >
        <FilterGroup label="When">
          {(['all', 'week', 'month'] as const).map((value) => (
            <Chip
              key={value}
              active={time === value}
              label={
                value === 'all' ? 'All time' : value === 'week' ? 'This week' : 'This month'
              }
              onPress={() => {
                setTime(value);
                resetPage();
              }}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="Mood">
          <Chip
            active={mood === 'all'}
            label="Any"
            onPress={() => {
              setMood('all');
              resetPage();
            }}
          />
          {MOODS.map((option) => (
            <Chip
              key={option.value}
              active={mood === option.value}
              label={option.label}
              onPress={() => {
                setMood(option.value);
                resetPage();
              }}
            />
          ))}
        </FilterGroup>
        {notebooks.length > 1 ? (
          <FilterGroup label="Notebook">
            <Chip
              active={notebookFilter === 'all'}
              label="All notebooks"
              onPress={() => {
                setNotebookFilter('all');
                resetPage();
              }}
            />
            {notebooks.map((notebook) => (
              <Chip
                key={notebook.id}
                active={notebookFilter === notebook.id}
                label={notebook.name}
                onPress={() => {
                  setNotebookFilter(notebook.id);
                  resetPage();
                }}
              />
            ))}
          </FilterGroup>
        ) : null}
        <View style={styles.filterActions}>
          <Button
            label="Clear all"
            onPress={() => {
              setMood('all');
              setTime('all');
              setNotebookFilter('all');
              resetPage();
            }}
            variant="secondary"
          />
          <Button label="Done" onPress={() => setFiltersOpen(false)} />
        </View>
      </Sheet>

      <Sheet
        onClose={() => setMoveTarget(null)}
        title="Move to notebook"
        visible={moveTarget !== null}
      >
        {notebooks.map((notebook) => {
          const current = entries.find((entry) => entry.date === moveTarget);
          const isCurrent = current?.notebookId === notebook.id;
          return (
            <Pressable
              key={notebook.id}
              accessibilityRole="button"
              disabled={isCurrent || busy}
              onPress={() => void confirmMove(notebook.id)}
              style={({ pressed }) => [
                styles.moveRow,
                {
                  borderBottomColor: theme.border,
                  opacity: isCurrent ? 0.4 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <ThemedText style={styles.flex}>{notebook.name}</ThemedText>
              {notebook.isDefault ? (
                <ThemedText type="caption" themeColor="accent">
                  default
                </ThemedText>
              ) : null}
              {isCurrent ? (
                <Ionicons color={theme.accent} name="checkmark" size={18} />
              ) : null}
            </Pressable>
          );
        })}
      </Sheet>

      <ConfirmSheet
        busy={busy}
        confirmLabel="Delete"
        destructive
        message="Deleting this reflection is permanent. It is removed from every device on the next sync."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this reflection?"
        visible={deleteTarget !== null}
      />

      <Sheet
        onClose={() => setSealedOpen(false)}
        title="The Archive is sealed"
        visible={sealedOpen}
      >
        <ThemedText themeColor="textSecondary">
          This day is older than your writing window. Existing pages stay
          editable; new pages can be written back to the start of your window
          ({ENTITLEMENTS[plan].backfillDays === Number.POSITIVE_INFINITY
            ? 'unlimited on Pro'
            : `${ENTITLEMENTS[plan].backfillDays} days on ${plan}`}
          ).
        </ThemedText>
        <Button label="Understood" onPress={() => setSealedOpen(false)} />
      </Sheet>
    </Screen>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function CalendarGrid({
  year,
  month,
  today,
  entryDates,
  moodByDate,
  onPick,
}: {
  year: number;
  month: number;
  today: string;
  entryDates: Set<string>;
  moodByDate: Map<string, number | null>;
  onPick: (date: string) => void;
}) {
  const theme = useTheme();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <View style={styles.grid}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
        <View key={`${day}-${index}`} style={styles.cell}>
          <ThemedText type="caption" themeColor="textSecondary">
            {day}
          </ThemedText>
        </View>
      ))}
      {cells.map((day, index) => {
        if (day === null) {
          return <View key={`empty-${index}`} style={styles.cell} />;
        }
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEntry = entryDates.has(date);
        const mood = moodByDate.get(date) ?? null;
        const isToday = date === today;
        const future = date > today;
        return (
          <Pressable
            key={date}
            accessibilityLabel={formatDisplayDate(date)}
            accessibilityRole="button"
            disabled={future}
            onPress={() => onPick(date)}
            style={[
              styles.cell,
              styles.dayCell,
              isToday && { borderColor: theme.accent, borderWidth: 1 },
              { opacity: future ? 0.25 : 1 },
            ]}
          >
            <View
              style={[
                styles.dayDot,
                {
                  backgroundColor: hasEntry
                    ? theme.mood[
                        Math.min(5, Math.max(1, mood ?? 3)) as 1 | 2 | 3 | 4 | 5
                      ].solid
                    : 'transparent',
                },
              ]}
            />
            <ThemedText
              type="caption"
              themeColor={hasEntry ? 'text' : 'textSecondary'}
            >
              {day}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  stat: { gap: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  searchInput: { flex: 1 },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  calendarCard: { gap: Spacing.two },
  calendarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayCell: { borderRadius: Radii.sm },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  skeletonList: { gap: Spacing.two },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
  },
  entryMain: { flex: 1 },
  entryText: { gap: 2 },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  entryTitle: { flex: 1 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  filterGroup: { gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterActions: { flexDirection: 'row', gap: Spacing.two },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
