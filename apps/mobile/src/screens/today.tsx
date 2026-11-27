import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  computeCurrentStreak,
  formatDisplayDate,
  getLocalDateString,
  selectLocalFlashback,
} from '@withink/core';
import { useRouter } from 'expo-router';
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
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { readFlashbackHistory } from '@/lib/flashback-history';
import { useDiary } from '@/providers/diary-provider';

export function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    session,
    entries,
    pending,
    loadingData,
    syncing,
    syncState,
    syncNotice,
    lastSyncedAt,
    syncNow,
    revision,
  } = useDiary();

  const today = getLocalDateString();
  const yesterday = addDays(today, -1);
  const todayEntry = entries.find((entry) => entry.date === today);
  const yesterdayEntry = entries.find((entry) => entry.date === yesterday);
  const recent = entries.slice(0, 3);
  const streak = computeCurrentStreak(
    entries.map((entry) => entry.date),
    today,
  );

  const [flashback, setFlashback] = React.useState<{
    date: string;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const history = await readFlashbackHistory();
      const result = selectLocalFlashback(
        entries.map((entry) => entry.date),
        today,
        history,
      );
      if (!cancelled) setFlashback(result.pick);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries, today, revision]);

  const openEntry = React.useCallback(
    (date: string) => {
      router.push({ pathname: '/entries/[date]', params: { date } });
    },
    [router],
  );

  const firstName =
    (session?.user.name ?? '').trim().split(/\s+/)[0] || 'Writer';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void syncNow()}
            refreshing={syncing}
            tintColor={theme.foreground}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greeting}>
          <ThemedText type="label" themeColor="textSecondary">
            {formatDisplayDate(today, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </ThemedText>
          <ThemedText type="subtitle">
            Good morning,{' '}
            <ThemedText type="subtitle" themeColor="accent">
              {firstName}.
            </ThemedText>
          </ThemedText>
          <ThemedText type="hand" themeColor="textSecondary">
            {firstName}&apos;s page, one day at a time
          </ThemedText>
        </View>

        <SyncLine
          lastSyncedAt={lastSyncedAt}
          pending={pending}
          syncNotice={syncNotice}
          syncState={syncState}
        />

        {!loadingData && entries.length === 0 ? (
          <Card style={styles.restoreCard}>
            <ThemedText type="smallBold">Restore journal</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This device has no local pages yet. Pull the encrypted archive
              from your account — it stays encrypted until it reaches this
              phone.
            </ThemedText>
            <Button
              label="Restore from cloud"
              loading={syncing}
              onPress={() => void syncNow()}
              variant="secondary"
            />
          </Card>
        ) : null}

        {!yesterdayEntry && !loadingData ? (
          <Card style={styles.yesterday}>
            <ThemedText type="label" themeColor="accent">
              Yesterday is blank
            </ThemedText>
            <ThemedText type="heading">
              Write yesterday&apos;s reflection
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              It looks like you missed writing yesterday. A few lines are
              enough to keep the thread.
            </ThemedText>
            <Button
              label="Write yesterday"
              onPress={() => openEntry(yesterday)}
              variant="secondary"
            />
          </Card>
        ) : null}

        <Card style={styles.todayCard}>
          {todayEntry ? (
            <>
              <ThemedText type="label" themeColor="textSecondary">
                Today&apos;s page
              </ThemedText>
              <ThemedText type="heading">
                {todayEntry.title || 'Untitled Reflection'}
              </ThemedText>
              <ThemedText
                numberOfLines={4}
                type="serif"
                themeColor="textSecondary"
              >
                {todayEntry.snippet ||
                  (todayEntry.contentText
                    ? todayEntry.contentText.slice(0, 180)
                    : 'This entry is empty. Edit to write your thoughts.')}
              </ThemedText>
              <Button
                label="Edit entry"
                onPress={() => openEntry(today)}
                variant="secondary"
              />
            </>
          ) : (
            <>
              <ThemedText type="label" themeColor="textSecondary">
                Today
              </ThemedText>
              <ThemedText type="heading">
                A page waiting to be written
              </ThemedText>
              <ThemedText type="serif" themeColor="textSecondary">
                Start with a sentence. The rest will follow.
              </ThemedText>
              <Button
                label="Write today's entry"
                onPress={() => openEntry(today)}
              />
            </>
          )}
        </Card>

        <View style={[styles.streak, { borderColor: theme.border }]}>
          <Ionicons color={theme.accent} name="flame-outline" size={22} />
          <View style={styles.streakText}>
            <ThemedText type="smallBold">
              {streak} {streak === 1 ? 'day' : 'days'} in a row
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Streaks are a quiet record, never a demand.
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText type="heading">Recent reflections</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/entries')}
            >
              <ThemedText type="smallBold" themeColor="accent">
                View archive
              </ThemedText>
            </Pressable>
          </View>

          {loadingData && entries.length === 0 ? (
            <View style={styles.skeletonList}>
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </View>
          ) : recent.length === 0 ? (
            <EmptyState
              title="The index is empty"
              body="Today's page starts it."
              action={
                <Button
                  label="Write today's entry"
                  onPress={() => openEntry(today)}
                  variant="secondary"
                />
              }
            />
          ) : (
            recent.map((entry, index) => (
              <Pressable
                key={entry.date}
                accessibilityRole="button"
                onPress={() => openEntry(entry.date)}
                style={({ pressed }) => [
                  styles.recentRow,
                  {
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <ThemedText type="small" themeColor="accent">
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
                <View style={styles.recentText}>
                  <ThemedText numberOfLines={1}>
                    {entry.title || 'Untitled Reflection'}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {formatDisplayDate(entry.date, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </ThemedText>
                </View>
                {entry.mood ? <MoodDot mood={entry.mood} /> : null}
                <Ionicons
                  color={theme.mutedForeground}
                  name="chevron-forward"
                  size={16}
                />
              </Pressable>
            ))
          )}
        </View>

        <Card style={styles.flashback}>
          <View style={styles.flashbackHead}>
            <Ionicons color={theme.accent} name="sparkles-outline" size={18} />
            <ThemedText type="label" themeColor="textSecondary">
              Flashback
            </ThemedText>
          </View>
          {flashback ? (
            <>
              <ThemedText type="small" themeColor="accent">
                {flashback.label}
              </ThemedText>
              <ThemedText type="heading">
                {entries.find((entry) => entry.date === flashback.date)
                  ?.title || 'A reflection from your archives'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDisplayDate(flashback.date, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </ThemedText>
              <Button
                label="Open flashback"
                onPress={() => router.push('/flashbacks')}
                variant="ghost"
              />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Flashbacks appear once your archive has older pages to revisit.
            </ThemedText>
          )}
        </Card>

        <View style={{ height: Spacing.five }} />
      </ScrollView>
    </Screen>
  );
}

function SyncLine({
  pending,
  syncNotice,
  syncState,
  lastSyncedAt,
}: {
  pending: number;
  syncNotice: string | null;
  syncState: string;
  lastSyncedAt: number | null;
}) {
  const text =
    syncNotice ??
    (pending > 0
      ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to sync.`
      : syncState === 'offline'
        ? 'Offline — changes stay safe on this device.'
        : lastSyncedAt
          ? 'Synced.'
          : 'Sync starts after your first page.');
  return (
    <ThemedText type="caption" themeColor="textSecondary">
      {text}
    </ThemedText>
  );
}

function MoodDot({ mood }: { mood: number }) {
  const theme = useTheme();
  const level = Math.min(5, Math.max(1, mood)) as 1 | 2 | 3 | 4 | 5;
  return (
    <View
      accessibilityLabel={`Mood ${mood} of 5`}
      style={[styles.moodDot, { backgroundColor: theme.mood[level].solid }]}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  greeting: { gap: Spacing.one, paddingTop: Spacing.four },
  restoreCard: { gap: Spacing.two },
  yesterday: { gap: Spacing.two },
  todayCard: { gap: Spacing.two },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  streakText: { flex: 1, gap: 2 },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  skeletonList: { gap: Spacing.two },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: { flex: 1, gap: 2 },
  moodDot: { width: 10, height: 10, borderRadius: 5 },
  flashback: { gap: Spacing.two, marginTop: Spacing.two },
  flashbackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
