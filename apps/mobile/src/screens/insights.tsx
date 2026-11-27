import {
  addDays,
  computeInsights,
  formatDisplayDate,
  getLocalDateString,
  type HeatmapDay,
} from '@withink/core';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, EmptyState, SectionLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary } from '@/providers/diary-provider';

const MOOD_LABELS = ['Angry', 'Sad', 'Neutral', 'Happy', 'Radiant'] as const;

export function InsightsScreen() {
  const theme = useTheme();
  const { entries } = useDiary();
  const today = getLocalDateString();

  const insights = React.useMemo(
    () =>
      computeInsights(
        entries.map((entry) => ({
          date: entry.date,
          wordCount: entry.wordCount,
          mood: entry.mood,
          createdAt: entry.createdAt,
        })),
        today,
        new Date().getTimezoneOffset(),
      ),
    [entries, today],
  );

  const maxMood = Math.max(1, ...Object.values(insights.moodStats.distribution));
  const maxMonthlyWords = Math.max(
    1,
    ...insights.wordCountStats.monthlyTotals.map((month) => month.totalWords),
  );

  if (entries.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Private insights"
          body="Write a few pages and the patterns — streaks, word counts, the hours you write best — appear here, computed on this device."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            06 · Insights
          </ThemedText>
          <ThemedText type="subtitle">Private insights.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Computed on this phone from your decrypted pages.
          </ThemedText>
        </View>

        <View style={styles.statStrip}>
          <Stat
            label="Current streak"
            value={`${insights.streaks.currentStreak}d`}
          />
          <Stat
            label="Longest streak"
            value={`${insights.streaks.longestStreak}d`}
          />
          <Stat
            label="Total words"
            value={insights.wordCountStats.total.toLocaleString('en-US')}
          />
          <Stat label="Entries" value={String(entries.length)} />
        </View>

        <SectionLabel>Heatmap · last 365 days</SectionLabel>
        <Card>
          <Heatmap days={insights.heatmap} />
          <ThemedText type="caption" themeColor="textSecondary">
            Each cell is a day. Colour follows the mood you recorded.
          </ThemedText>
        </Card>

        <SectionLabel>Mood</SectionLabel>
        <Card style={styles.gap}>
          {insights.moodStats.average !== null ? (
            <ThemedText type="smallBold">
              Average {insights.moodStats.average.toFixed(1)} / 5
            </ThemedText>
          ) : null}
          {MOOD_LABELS.map((label, index) => {
            const level = (index + 1) as 1 | 2 | 3 | 4 | 5;
            const count = insights.moodStats.distribution[level] ?? 0;
            return (
              <View key={label} style={styles.barRow}>
                <ThemedText type="caption" style={styles.barLabel}>
                  {label}
                </ThemedText>
                <View style={[styles.barTrack, { backgroundColor: theme.muted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(count / maxMood) * 100}%`,
                        backgroundColor: theme.mood[level].solid,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {count}
                </ThemedText>
              </View>
            );
          })}
          {insights.moodStats.monthlyAverages.length > 0 ? (
            <View style={styles.monthlyRow}>
              {insights.moodStats.monthlyAverages.map((month) => (
                <View key={month.month} style={styles.month}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {month.month.slice(5)}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {month.averageMood === null
                      ? '—'
                      : month.averageMood.toFixed(1)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <SectionLabel>Words by month</SectionLabel>
        <Card style={styles.gap}>
          {insights.wordCountStats.monthlyTotals.map((month) => (
            <View key={month.month} style={styles.monthBarRow}>
              <ThemedText type="caption" style={styles.monthLabel}>
                {month.month}
              </ThemedText>
              <View style={[styles.barTrack, { backgroundColor: theme.muted }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(month.totalWords / maxMonthlyWords) * 100}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {month.totalWords.toLocaleString('en-US')}
              </ThemedText>
            </View>
          ))}
          <ThemedText type="caption" themeColor="textSecondary">
            Average {insights.wordCountStats.average} words per page.
          </ThemedText>
        </Card>

        <SectionLabel>When you write</SectionLabel>
        <Card style={styles.gap}>
          <Row
            label="Most active day"
            value={
              insights.activitySummaries.mostActiveDayOfWeek
                ? `${insights.activitySummaries.mostActiveDayOfWeek.day} · ${insights.activitySummaries.mostActiveDayOfWeek.count}`
                : 'Not enough pages yet'
            }
          />
          <Row
            label="Most active time"
            value={
              insights.activitySummaries.mostActiveTimeOfDay
                ? `${insights.activitySummaries.mostActiveTimeOfDay.period} · ${insights.activitySummaries.mostActiveTimeOfDay.count}`
                : 'Not enough pages yet'
            }
          />
        </Card>

        <SectionLabel>Monthly overview</SectionLabel>
        <Card style={styles.gap}>
          {Object.entries(insights.monthlyOverview)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([month, stat]) => (
              <Row
                key={month}
                label={month}
                value={`${stat.entryCount} ${
                  stat.entryCount === 1 ? 'page' : 'pages'
                } · ${stat.totalWords.toLocaleString('en-US')} words`}
              />
            ))}
        </Card>

        <View style={{ height: Spacing.five }} />
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="heading">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" style={styles.flex}>
        {label}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

function Heatmap({ days }: { days: HeatmapDay[] }) {
  const theme = useTheme();
  const byDate = new Map(days.map((day) => [day.date, day]));
  const today = getLocalDateString();
  const start = addDays(today, -364);
  const startDate = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  );
  const pad = startDate.getDay();
  const cells: (HeatmapDay | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: 365 }, (_, index) => {
      const date = addDays(start, index);
      return byDate.get(date) ?? { date, count: 0, wordCount: 0, mood: null };
    }),
  ];
  const columns: (HeatmapDay | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    columns.push(cells.slice(index, index + 7));
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.heatmap}>
        {columns.map((column, columnIndex) => (
          <View key={columnIndex} style={styles.heatColumn}>
            {column.map((cell, rowIndex) => {
              const level = cell?.mood
                ? (Math.min(5, Math.max(1, cell.mood)) as 1 | 2 | 3 | 4 | 5)
                : null;
              return (
                <View
                  key={`${columnIndex}-${rowIndex}`}
                  accessibilityLabel={
                    cell
                      ? `${formatDisplayDate(cell.date)}: ${cell.count} entries`
                      : undefined
                  }
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: level
                        ? theme.mood[level].solid
                        : cell?.count
                          ? theme.mutedForeground
                          : theme.muted,
                      opacity: level || cell?.count ? 1 : 0.6,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  statStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  stat: { minWidth: '22%', gap: 2 },
  gap: { gap: Spacing.two },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: { width: 56 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  month: { alignItems: 'center', gap: 2 },
  monthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  monthLabel: { width: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  heatmap: { flexDirection: 'row', gap: 2 },
  heatColumn: { gap: 2 },
  heatCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
