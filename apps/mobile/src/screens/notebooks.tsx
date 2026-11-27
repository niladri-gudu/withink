import { Ionicons } from '@expo/vector-icons';
import { ENTITLEMENTS } from '@withink/core';
import { useRouter } from 'expo-router';
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
  Field,
  Sheet,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { mobileLocalStore } from '@/lib/local-store';
import { describeError, useDiary } from '@/providers/diary-provider';

type EditMode =
  | { type: 'create' }
  | { type: 'rename'; id: string; name: string }
  | null;

export function NotebooksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { notebooks, plan, refreshLocal } = useDiary();
  const [mode, setMode] = React.useState<EditMode>(null);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const limit = ENTITLEMENTS[plan].notebookLimit;

  async function reload() {
    const list = await createDiaryClient().getNotebooks();
    await mobileLocalStore.putNotebooks(list);
    await refreshLocal();
  }

  function beginCreate() {
    if (notebooks.length >= limit) {
      setLimitOpen(true);
      return;
    }
    setName('');
    setError(null);
    setMode({ type: 'create' });
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the notebook a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const api = createDiaryClient();
      if (mode?.type === 'rename') {
        await api.renameNotebook(mode.id, trimmed);
      } else {
        await api.createNotebook(trimmed);
      }
      await reload();
      setMode(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try {
      await createDiaryClient().setDefaultNotebook(id);
      await reload();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await createDiaryClient().deleteNotebook(deleteTarget);
      await reload();
      setDeleteTarget(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            03 · Notebooks
          </ThemedText>
          <ThemedText type="subtitle">Shelves for your pages</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {notebooks.length} of{' '}
            {Number.isFinite(limit)
              ? `${limit} ${limit === 1 ? 'notebook' : 'notebooks'}`
              : 'unlimited notebooks'}{' '}
            on {plan}.
          </ThemedText>
        </View>

        <Button label="New notebook" onPress={beginCreate} variant="secondary" />

        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}

        {notebooks.length === 0 ? (
          <EmptyState
            title="No notebooks yet"
            body="Your first notebook is created automatically when it is needed."
          />
        ) : (
          notebooks.map((notebook, index) => (
            <Card key={notebook.id} style={styles.card}>
              <View style={styles.cardHead}>
                <ThemedText type="caption" themeColor="accent">
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
                <View style={styles.cardTitle}>
                  <ThemedText type="heading">{notebook.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {notebook.entryCount}{' '}
                    {notebook.entryCount === 1 ? 'entry' : 'entries'}
                    {notebook.lastWrittenAt
                      ? ` · last written ${notebook.lastWrittenAt.slice(0, 10)}`
                      : ''}
                  </ThemedText>
                </View>
                {notebook.isDefault ? (
                  <View style={styles.defaultTag}>
                    <Ionicons color={theme.accent} name="checkmark" size={14} />
                    <ThemedText type="caption" themeColor="accent">
                      default
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <Button
                  label="Open"
                  onPress={() =>
                    router.push({
                      pathname: '/entries',
                      params: { notebook: notebook.id },
                    })
                  }
                  style={styles.flex}
                  variant="secondary"
                />
                {!notebook.isDefault ? (
                  <Button
                    disabled={busy}
                    label="Make default"
                    onPress={() => void makeDefault(notebook.id)}
                    style={styles.flex}
                    variant="ghost"
                  />
                ) : null}
              </View>
              <View style={styles.iconActions}>
                <Pressable
                  accessibilityLabel="Rename notebook"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    setName(notebook.name);
                    setError(null);
                    setMode({
                      type: 'rename',
                      id: notebook.id,
                      name: notebook.name,
                    });
                  }}
                >
                  <Ionicons color={theme.mutedForeground} name="pencil" size={18} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Delete notebook"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setDeleteTarget(notebook.id)}
                >
                  <Ionicons
                    color={theme.destructive}
                    name="trash-outline"
                    size={18}
                  />
                </Pressable>
              </View>
            </Card>
          ))
        )}

        <ThemedText type="caption" themeColor="textSecondary">
          Deleting a notebook is allowed only while it is empty. Move its pages
          first — nothing is ever deleted by re-filing.
        </ThemedText>
      </ScrollView>

      <Sheet
        onClose={() => setMode(null)}
        title={mode?.type === 'rename' ? 'Rename notebook' : 'New notebook'}
        visible={mode !== null}
      >
        <Field
          autoFocus
          error={error}
          label="Name"
          maxLength={60}
          onChangeText={setName}
          onSubmitEditing={() => void submit()}
          placeholder="e.g. Morning pages"
          value={name}
        />
        <Button
          disabled={busy || name.trim().length === 0}
          label={mode?.type === 'rename' ? 'Save name' : 'Create notebook'}
          loading={busy}
          onPress={() => void submit()}
        />
      </Sheet>

      <Sheet
        onClose={() => setLimitOpen(false)}
        title="Notebook limit"
        visible={limitOpen}
      >
        <ThemedText themeColor="textSecondary">
          Your {plan} plan includes{' '}
          {Number.isFinite(limit)
            ? `${limit} ${limit === 1 ? 'notebook' : 'notebooks'}`
            : 'unlimited notebooks'}
          . Existing notebooks keep working on any plan; this only limits new
          ones.
        </ThemedText>
        <View style={styles.chipRow}>
          <Chip
            active={false}
            label="Plus · 3"
            onPress={() => undefined}
          />
          <Chip
            active={false}
            label="Pro · 10"
            onPress={() => undefined}
          />
        </View>
        <Button label="Close" onPress={() => setLimitOpen(false)} />
      </Sheet>

      <ConfirmSheet
        busy={busy}
        confirmLabel="Delete notebook"
        destructive
        message="Only empty notebooks can be deleted. If it still holds entries the server will refuse until they are moved."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this notebook?"
        visible={deleteTarget !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  card: { gap: Spacing.two },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: { flex: 1, gap: 2 },
  defaultTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.two },
  iconActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    paddingTop: Spacing.one,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
});
