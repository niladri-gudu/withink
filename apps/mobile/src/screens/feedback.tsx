import { Ionicons } from '@expo/vector-icons';
import {
  FEEDBACK_CATEGORIES,
  feedbackSchema,
  type FeedbackCategory,
} from '@withink/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Field, SectionLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { describeError } from '@/providers/diary-provider';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  idea: 'Idea',
  general: 'Note',
};

const CATEGORY_PLACEHOLDERS: Record<FeedbackCategory, string> = {
  bug: 'Something broke',
  idea: 'A feature that would help',
  general: 'Anything else on your mind',
};

export function FeedbackScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [category, setCategory] = React.useState<FeedbackCategory>('bug');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    const parsed = feedbackSchema.safeParse({ category, subject, message });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? 'Please check your submission.',
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createDiaryClient().submitFeedback(parsed.data);
      setSent(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  function sendAnother() {
    setSubject('');
    setMessage('');
    setError(null);
    setSent(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.back()}
            >
              <Ionicons
                color={theme.foreground}
                name="chevron-back"
                size={24}
              />
            </Pressable>
            <View style={styles.flex}>
              <ThemedText type="label" themeColor="textSecondary">
                Support · Feedback
              </ThemedText>
              <ThemedText type="subtitle">Tell us what you think</ThemedText>
            </View>
          </View>

          {sent ? (
            <Card style={styles.gap}>
              <ThemedText type="heading">Thank you.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Your note is on its way to the people building Withink. We read
                every one.
              </ThemedText>
              <Button
                label="Send another"
                onPress={sendAnother}
                variant="secondary"
              />
              <Button label="Back" onPress={() => router.back()} />
            </Card>
          ) : (
            <>
              {error ? (
                <ThemedText type="small" themeColor="destructive">
                  {error}
                </ThemedText>
              ) : null}

              <SectionLabel>Kind</SectionLabel>
              <View style={styles.chips}>
                {FEEDBACK_CATEGORIES.map((value) => (
                  <Chip
                    active={category === value}
                    key={value}
                    label={CATEGORY_LABELS[value]}
                    onPress={() => setCategory(value)}
                  />
                ))}
              </View>

              <Field
                hint="A short title for your note."
                label="Summary"
                maxLength={120}
                onChangeText={setSubject}
                placeholder={CATEGORY_PLACEHOLDERS[category]}
                value={subject}
              />

              <Field
                hint="What happened, and what you expected instead."
                label="Details"
                maxLength={4000}
                multiline
                numberOfLines={6}
                onChangeText={setMessage}
                style={styles.message}
                value={message}
              />

              <Button
                disabled={busy}
                label="Send feedback"
                loading={busy}
                onPress={() => void submit()}
              />

              <ThemedText type="caption" themeColor="textSecondary">
                Screenshots can be attached from the web app. Up to five notes
                per hour.
              </ThemedText>
            </>
          )}

          <View style={{ height: Spacing.five }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  chips: { flexDirection: 'row', gap: Spacing.two },
  gap: { gap: Spacing.two },
  message: { minHeight: 120, textAlignVertical: 'top' },
});
