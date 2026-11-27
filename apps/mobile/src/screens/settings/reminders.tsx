import { Ionicons } from '@expo/vector-icons';
import type { NotificationSettingsView } from '@withink/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, SectionLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { describeError } from '@/providers/diary-provider';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function ReminderSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [view, setView] = React.useState<NotificationSettingsView | null>(null);
  const [dailyEnabled, setDailyEnabled] = React.useState(false);
  const [time, setTime] = React.useState('09:00');
  const [lettersEnabled, setLettersEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await createDiaryClient().getNotificationSettings();
        if (cancelled) return;
        setView(settings);
        setDailyEnabled(settings.settings.dailyReminderEnabled);
        setTime(settings.settings.reminderTime);
        setLettersEnabled(settings.settings.letterAlertsEnabled);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!TIME_PATTERN.test(time.trim())) {
      setError('Use a 24-hour time like 09:00.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await createDiaryClient().saveNotificationSettings({
        dailyReminderEnabled: dailyEnabled,
        reminderTime: time.trim(),
        letterAlertsEnabled: lettersEnabled,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });
      setNotice('Reminder preferences saved.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

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
              Settings · Reminders
            </ThemedText>
            <ThemedText type="subtitle">A quiet nudge</ThemedText>
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

        <Card style={styles.gap}>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Daily writing reminder</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                One notice at a time you choose. Never marketing.
              </ThemedText>
            </View>
            <Switch
              onValueChange={setDailyEnabled}
              thumbColor={dailyEnabled ? theme.accent : undefined}
              value={dailyEnabled}
            />
          </View>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            hint="24-hour local time, e.g. 20:30"
            keyboardType="numbers-and-punctuation"
            label="Reminder time"
            maxLength={5}
            onChangeText={setTime}
            placeholder="09:00"
            value={time}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Letters arriving</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Tell me when a letter written to the future arrives.
              </ThemedText>
            </View>
            <Switch
              onValueChange={setLettersEnabled}
              thumbColor={lettersEnabled ? theme.accent : undefined}
              value={lettersEnabled}
            />
          </View>
          <Button
            disabled={loading}
            label="Save reminders"
            loading={busy}
            onPress={() => void save()}
          />
        </Card>

        <SectionLabel>Delivery</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="small">
            {view?.configured
              ? `${view.deviceCount} ${view.deviceCount === 1 ? 'device is' : 'devices are'} registered for notifications.`
              : 'Push delivery is not configured on the server yet.'}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Reminders follow your local timezone and are sent by the server at
            the chosen time. This install registers only after native push
            credentials are configured for the build.
          </ThemedText>
        </Card>
      </ScrollView>
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
  gap: { gap: Spacing.three },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
