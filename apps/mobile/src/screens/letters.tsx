import { Ionicons } from '@expo/vector-icons';
import type { LetterMeta } from '@withink/api-client';
import { ENTITLEMENTS, countdownFor, formatDisplayDate } from '@withink/core';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { decryptText } from '@/lib/crypto';
import { countActiveLetters, groupLetters } from '@/lib/letters';
import { describeError, useDiary } from '@/providers/diary-provider';

type LetterKind = 'arrived' | 'pending' | 'opened';

function shortDate(date: string): string {
  return formatDisplayDate(date, { month: 'short', day: 'numeric' });
}

/**
 * The letters shelf: everything on its way to future you, everything that has
 * arrived, and the letters already opened. Server-authoritative — the list and
 * its `today` come from one request so delivery can never drift from web.
 */
export function LettersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { masterKey, plan, bootstrap } = useDiary();
  const accountEncrypted = bootstrap?.encryption.isClientEncrypted ?? false;

  const [letters, setLetters] = React.useState<LetterMeta[]>([]);
  const [today, setToday] = React.useState('');
  const [decryptedTitles, setDecryptedTitles] = React.useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LetterMeta | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);

  const limit = ENTITLEMENTS[plan].futureLetterLimit;

  const load = React.useCallback(async () => {
    try {
      const result = await createDiaryClient().getLetters();
      setLetters(result.letters);
      setToday(result.today);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load]),
  );

  const plainTitles = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const letter of letters) map[letter.id] = letter.title;
    return map;
  }, [letters]);

  // Titles are ciphertext under zero-knowledge, so decrypt on device once the
  // master key is available. The shelf never blocks on this: rows hold space
  // with a skeleton until the plaintext arrives.
  React.useEffect(() => {
    if (!accountEncrypted || !masterKey) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const letter of letters) {
        try {
          next[letter.id] = await decryptText(letter.title, masterKey);
        } catch {
          next[letter.id] = '';
        }
      }
      if (!cancelled) setDecryptedTitles(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [letters, accountEncrypted, masterKey]);

  const titles = accountEncrypted ? decryptedTitles : plainTitles;

  const grouped = React.useMemo(
    () => groupLetters(letters, today),
    [letters, today],
  );
  const activeCount = React.useMemo(
    () => countActiveLetters(letters, today),
    [letters, today],
  );
  const atCap = Number.isFinite(limit) && activeCount >= limit;
  const empty =
    grouped.arrivedUnread.length === 0 &&
    grouped.pending.length === 0 &&
    grouped.opened.length === 0;

  function startLetter() {
    if (atCap) {
      setLimitOpen(true);
      return;
    }
    router.push({ pathname: '/letters/[id]', params: { id: 'new' } });
  }

  function openLetter(letter: LetterMeta) {
    router.push({ pathname: '/letters/[id]', params: { id: letter.id } });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await createDiaryClient().deleteLetter(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  function renderTitle(letter: LetterMeta) {
    const title = titles[letter.id];
    if (title === undefined) {
      return <Skeleton height={18} width="65%" />;
    }
    return (
      <ThemedText type="heading" numberOfLines={2}>
        {title.trim() || 'An untitled letter'}
      </ThemedText>
    );
  }

  function renderNote(letter: LetterMeta, kind: LetterKind) {
    if (kind === 'arrived') {
      return `a letter for you · written ${shortDate(letter.createdAt.slice(0, 10))}`;
    }
    if (kind === 'opened') {
      return `opened — ${shortDate(letter.unlockDate)}`;
    }
    const countdown = countdownFor(letter.unlockDate, today);
    return letter.sealed
      ? `${countdown.label} · resting`
      : `still being written · ${countdown.label}`;
  }

  function renderLetter(letter: LetterMeta, kind: LetterKind) {
    const note = renderNote(letter, kind);
    return (
      <Card key={letter.id} style={styles.card}>
        {kind === 'arrived' ? (
          <View style={[styles.arrivalEdge, { backgroundColor: theme.accent }]} />
        ) : null}
        <Pressable
          accessibilityLabel={`Open letter: ${titles[letter.id] ?? 'untitled'}`}
          accessibilityRole="button"
          onPress={() => openLetter(letter)}
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
        >
          {renderTitle(letter)}
          <ThemedText
            type="caption"
            themeColor={kind === 'arrived' ? 'accent' : 'textSecondary'}
          >
            {note}
          </ThemedText>
        </Pressable>
        <View style={styles.cardActions}>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatDisplayDate(letter.unlockDate, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
          <Pressable
            accessibilityLabel="Delete letter"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDeleteTarget(letter)}
          >
            <Ionicons
              color={theme.mutedForeground}
              name="trash-outline"
              size={17}
            />
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            04 · Letters
          </ThemedText>
          <ThemedText type="subtitle">Letters to future you.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {activeCount}{' '}
            {Number.isFinite(limit)
              ? `active of ${limit}`
              : `active · unlimited on ${plan}`}
            . Each letter opens on the day you choose — never before.
          </ThemedText>
        </View>

        <Button label="New letter" onPress={startLetter} variant="secondary" />

        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}

        {loading && letters.length === 0 ? (
          <Card style={styles.card}>
            <Skeleton height={18} width="55%" />
            <Skeleton height={12} width="80%" />
          </Card>
        ) : empty ? (
          <EmptyState
            title="No letters yet"
            body="Write something your future self will thank you for."
            action={
              <Button
                label="Write a letter"
                onPress={startLetter}
                variant="secondary"
              />
            }
          />
        ) : (
          <>
            {grouped.arrivedUnread.length > 0 ? (
              <>
                <ThemedText type="label" themeColor="textSecondary">
                  Arrived for you
                </ThemedText>
                {grouped.arrivedUnread.map((letter) =>
                  renderLetter(letter, 'arrived'),
                )}
              </>
            ) : null}

            <ThemedText type="label" themeColor="textSecondary">
              Sealed
            </ThemedText>
            {grouped.pending.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No letters are on their way yet.
              </ThemedText>
            ) : (
              grouped.pending.map((letter) =>
                renderLetter(letter, 'pending'),
              )
            )}

            {grouped.opened.length > 0 ? (
              <>
                <ThemedText type="label" themeColor="textSecondary">
                  Opened
                </ThemedText>
                {grouped.opened.map((letter) =>
                  renderLetter(letter, 'opened'),
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Sheet
        onClose={() => setLimitOpen(false)}
        title="Letters limit"
        visible={limitOpen}
      >
        <ThemedText themeColor="textSecondary">
          {Number.isFinite(limit)
            ? `Your ${plan} plan carries ${limit} ${
                limit === 1 ? 'letter' : 'letters'
              } at a time. A letter frees its slot the day it opens, and a sealed letter can't be edited.`
            : 'Your plan carries unlimited letters.'}
        </ThemedText>
        <View style={styles.chipRow}>
          <Chip active={false} label="Plus · 3" onPress={() => undefined} />
          <Chip active={false} label="Pro · unlimited" onPress={() => undefined} />
        </View>
        <Button label="Close" onPress={() => setLimitOpen(false)} />
      </Sheet>

      <ConfirmSheet
        busy={busy}
        confirmLabel="Delete letter"
        destructive
        message="Everything written in it will be gone for good. Its active slot is freed immediately."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this letter?"
        visible={deleteTarget !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  card: { gap: Spacing.two, paddingTop: Spacing.three },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  arrivalEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
});
