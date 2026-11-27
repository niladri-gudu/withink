import { formatDisplayDate, getLocalDateString, selectLocalFlashback } from '@withink/core';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { diaryCache } from '@/lib/diary-cache';
import {
  readFlashbackHistory,
  writeFlashbackHistory,
} from '@/lib/flashback-history';
import { useDiary } from '@/providers/diary-provider';

interface Picked {
  date: string;
  label: string;
}

export function FlashbacksScreen() {
  const { entries, masterKey } = useDiary();
  const today = getLocalDateString();
  const dates = React.useMemo(
    () => entries.map((entry) => entry.date),
    [entries],
  );

  const [history, setHistory] = React.useState<string[]>([]);
  const [pick, setPick] = React.useState<Picked | null>(null);
  const [body, setBody] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const choose = React.useCallback(
    async (nextHistory: string[]) => {
      const result = selectLocalFlashback(dates, today, nextHistory);
      setPick(result.pick);
      setHistory(result.history);
      await writeFlashbackHistory(result.history);
      setLoading(false);
      if (!result.pick || !masterKey) {
        setBody(null);
        return;
      }
      setBody(null);
      try {
        const document = await diaryCache.getLocalEntry(result.pick.date, masterKey);
        setBody(document?.contentText ?? null);
      } catch {
        setBody(null);
      }
    },
    [dates, today, masterKey],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readFlashbackHistory();
      if (!cancelled) await choose(stored);
    })();
    return () => {
      cancelled = true;
    };
    // Choosing on first mount is intentional; later picks are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates.length, masterKey]);

  const metadata = pick
    ? entries.find((entry) => entry.date === pick.date)
    : undefined;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            05 · Flashbacks
          </ThemedText>
          <ThemedText type="subtitle">A page from before.</ThemedText>
        </View>

        {loading ? (
          <Card style={styles.gap}>
            <Skeleton height={18} width="40%" />
            <Skeleton height={30} width="80%" />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} width="60%" />
          </Card>
        ) : !pick ? (
          <EmptyState
            title="No flashbacks yet"
            body="Flashbacks appear once your archive has pages older than yesterday to revisit."
          />
        ) : (
          <Card style={styles.gap}>
            <ThemedText type="small" themeColor="accent">
              {pick.label}
            </ThemedText>
            <ThemedText type="subtitle">
              {metadata?.title || 'Untitled Reflection'}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatDisplayDate(pick.date, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {metadata ? ` · ${metadata.wordCount} words` : ''}
            </ThemedText>
            {body ? (
              <ThemedText type="serif">{body}</ThemedText>
            ) : metadata?.contentText ? (
              <ThemedText type="serif" themeColor="textSecondary">
                {metadata.contentText}
              </ThemedText>
            ) : (
              <ThemedText type="serif" themeColor="textSecondary">
                This page is still being read from the archive…
              </ThemedText>
            )}
            <Button
              label="Show another"
              onPress={() => void choose([...history, pick.date])}
              variant="secondary"
            />
          </Card>
        )}

        <ThemedText type="caption" themeColor="textSecondary">
          Flashbacks are chosen on this device from your decrypted archive. They
          never leave the phone.
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  gap: { gap: Spacing.two },
});
