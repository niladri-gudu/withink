import { Ionicons } from '@expo/vector-icons';
import {
  ENTITLEMENTS,
  backfillWindowStart,
  formatDisplayDate,
  getLocalDateString,
} from '@withink/core';
import type {
  EditorCommand,
  EditorContentInput,
  EditorSnapshot,
  EditorTheme,
  FormatState,
} from '@withink/editor';
import {
  Redirect,
  useLocalSearchParams,
  usePreventRemove,
  useRouter,
} from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { EditorToolbar } from '@/components/editor-toolbar';
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from '@/components/rich-text-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  Sheet,
} from '@/components/ui';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { diaryCache } from '@/lib/diary-cache';
import { mobileLocalStore } from '@/lib/local-store';
import {
  isQuotaError,
  pickImageFromLibrary,
  prepareImage,
  uploadImage,
} from '@/lib/media-upload';
import { describeError, useDiary } from '@/providers/diary-provider';

const AUTOSAVE_MS = 1200;
const MOODS = [
  { value: 1, label: 'Angry' },
  { value: 2, label: 'Sad' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Happy' },
  { value: 5, label: 'Radiant' },
] as const;

type Gate = 'loading' | 'ok' | 'future' | 'sealed' | 'nodate';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain-text → TipTap-compatible HTML for entries saved by the old editor. */
function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const html = paragraphs
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
  return html || '';
}

function textToJson(text: string): unknown {
  const paragraphs = text.split(/\n{2,}/);
  return {
    type: 'doc',
    content: paragraphs.map((paragraph) => ({
      type: 'paragraph',
      content: paragraph
        ? [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }]
        : [],
    })),
  };
}

function saveSignature(input: {
  title: string;
  mood: number | null;
  notebookId: string | null;
  snapshot: EditorSnapshot | null;
}): string {
  return `${input.title} | ${input.mood ?? ''} | ${input.notebookId ?? ''} | ${
    input.snapshot?.html ?? ''
  } | ${input.snapshot?.text ?? ''}`;
}

const isConflict = (message: string | null) =>
  Boolean(message && /another device/i.test(message));

/**
 * Rich entry editor for the native client.
 *
 * The body is the shared TipTap editor in a bundled WebView, so formatting
 * round-trips with the web editor byte-for-byte. Writes stay local-first: every
 * autosave encrypts the document, metadata and queue item into SQLite before
 * the queue is pushed to the server.
 */
export function EntryEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const date = Array.isArray(params.date) ? params.date[0] : (params.date ?? '');
  const {
    masterKey,
    notebooks,
    plan,
    syncNow,
    refreshLocal,
    bumpRevision,
  } = useDiary();

  const [gate, setGate] = React.useState<Gate>('loading');
  const [title, setTitle] = React.useState('');
  const [mood, setMood] = React.useState<number | null>(null);
  const [notebookId, setNotebookId] = React.useState<string | null>(null);
  const [initialContent, setInitialContent] =
    React.useState<EditorContentInput | null>(null);
  const [editorKey, setEditorKey] = React.useState(0);
  const [format, setFormat] = React.useState<FormatState | null>(null);
  const [wordCount, setWordCount] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [allowLeave, setAllowLeave] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [imageBusy, setImageBusy] = React.useState(false);

  const editorRef = React.useRef<RichTextEditorHandle>(null);
  const snapshotRef = React.useRef<EditorSnapshot | null>(null);
  const titleRef = React.useRef('');
  const moodRef = React.useRef<number | null>(null);
  const notebookRef = React.useRef<string | null>(null);
  const dirtyRef = React.useRef(false);
  const lastSavedRef = React.useRef('');
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStoredEntryRef = React.useRef(false);
  const deletedRef = React.useRef(false);

  const editorTheme = React.useMemo<EditorTheme>(
    () => ({
      text: theme.foreground,
      background: theme.background,
      muted: theme.mutedForeground,
      accent: theme.accent,
      border: theme.border,
      codeBackground: theme.muted,
    }),
    [theme],
  );

  const applyEntry = React.useCallback(
    (entry: {
      title: string;
      mood: number | null;
      notebookId?: string;
      contentHtml: string;
      contentText: string;
      contentJson: unknown;
    } | null) => {
      if (!entry) {
        titleRef.current = '';
        setTitle('');
        moodRef.current = null;
        setMood(null);
        notebookRef.current = null;
        setNotebookId(null);
        setInitialContent({ html: '' });
        setEditorKey((value) => value + 1);
        return;
      }
      const hasText = entry.contentText.trim().length > 0;
      titleRef.current = entry.title;
      setTitle(entry.title);
      moodRef.current = entry.mood;
      setMood(entry.mood);
      notebookRef.current = entry.notebookId ?? null;
      setNotebookId(entry.notebookId ?? null);
      setInitialContent({
        html:
          entry.contentHtml ||
          (hasText ? textToHtml(entry.contentText) : ''),
        json:
          entry.contentJson &&
          typeof entry.contentJson === 'object' &&
          Object.keys(entry.contentJson as Record<string, unknown>).length > 0
            ? entry.contentJson
            : hasText
              ? textToJson(entry.contentText)
              : undefined,
      });
      setEditorKey((value) => value + 1);
    },
    [],
  );

  React.useEffect(() => {
    if (!masterKey || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!date) setGate('nodate');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const today = getLocalDateString();
        if (date > today) {
          if (!cancelled) setGate('future');
          return;
        }
        const metadata = await diaryCache.getLocalMetadata(date, masterKey);
        if (!metadata) {
          const earliest = backfillWindowStart(
            today,
            ENTITLEMENTS[plan].backfillDays,
          );
          if (earliest !== null && date < earliest) {
            if (!cancelled) setGate('sealed');
            return;
          }
        }
        const entry = await diaryCache.fetchEntryIfMissing(date, masterKey);
        if (cancelled) return;
        hasStoredEntryRef.current = Boolean(entry ?? metadata);
        applyEntry(entry);
        setGate('ok');
      } catch (err) {
        if (cancelled) return;
        setError(describeError(err));
        applyEntry(null);
        setGate('ok');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, masterKey, plan, applyEntry]);

  const persist = React.useCallback(
    async (announce: boolean, snapshotOverride?: EditorSnapshot | null) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (!masterKey || !date || deletedRef.current) return;

      const snapshot = snapshotOverride ?? snapshotRef.current;
      const contentText = snapshot?.text ?? '';
      if (titleRef.current.trim() === '' && contentText.trim() === '') {
        dirtyRef.current = false;
        setDirty(false);
        return;
      }

      try {
        await diaryCache.saveEntryLocally(
          {
            date,
            title: titleRef.current,
            contentText,
            contentHtml: snapshot?.html ?? '',
            contentJson: snapshot?.json ?? {},
            mood: moodRef.current,
            notebookId: notebookRef.current ?? undefined,
          },
          masterKey,
        );
        hasStoredEntryRef.current = true;
        lastSavedRef.current = saveSignature({
          title: titleRef.current,
          mood: moodRef.current,
          notebookId: notebookRef.current,
          snapshot,
        });
        dirtyRef.current = false;
        setDirty(false);
        setStatus('Saved on this device');
        setError(null);

        const flush = await diaryCache.flushQueue(masterKey);
        if (isConflict(flush.lastError)) {
          setConflict(flush.lastError);
          setStatus('Saved locally · sync conflict');
        } else {
          setConflict(null);
          setStatus(
            flush.failed > 0
              ? 'Saved on this device · will sync when back online'
              : announce
                ? 'Synced'
                : 'Saved on this device',
          );
        }
        bumpRevision();
        void refreshLocal();
      } catch (err) {
        setError(describeError(err));
        setStatus(null);
      }
    },
    [date, masterKey, bumpRevision, refreshLocal],
  );

  const scheduleAutosave = React.useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persist(false);
    }, AUTOSAVE_MS);
  }, [persist]);

  const markDirty = React.useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    setStatus(null);
  }, []);

  const handleSnapshot = React.useCallback(
    (snapshot: EditorSnapshot) => {
      snapshotRef.current = snapshot;
      setWordCount(snapshot.wordCount);
      markDirty();
      scheduleAutosave();
    },
    [markDirty, scheduleAutosave],
  );

  const handleLoaded = React.useCallback((snapshot: EditorSnapshot) => {
    snapshotRef.current = snapshot;
    setWordCount(snapshot.wordCount);
    // Opening a page is not an edit: record the normalized content as the
    // baseline so leaving without changes never queues a pointless push.
    lastSavedRef.current = saveSignature({
      title: titleRef.current,
      mood: moodRef.current,
      notebookId: notebookRef.current,
      snapshot,
    });
    dirtyRef.current = false;
    setDirty(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const current = snapshotRef.current;
      if (
        dirtyRef.current &&
        current &&
        saveSignature({
          title: titleRef.current,
          mood: moodRef.current,
          notebookId: notebookRef.current,
          snapshot: current,
        }) !== lastSavedRef.current
      ) {
        void persist(false, current);
      }
    };
  }, [persist]);

  usePreventRemove(!allowLeave, ({ repeat }) => {
    void (async () => {
      if (deletedRef.current) {
        setAllowLeave(true);
        repeat();
        return;
      }
      const snapshot = await editorRef.current?.flush();
      if (snapshot) snapshotRef.current = snapshot;
      const current = snapshot ?? snapshotRef.current;
      if (
        current &&
        saveSignature({
          title: titleRef.current,
          mood: moodRef.current,
          notebookId: notebookRef.current,
          snapshot: current,
        }) !== lastSavedRef.current
      ) {
        await persist(false, current);
      }
      setAllowLeave(true);
      repeat();
    })();
  });

  const handleCommand = React.useCallback((command: EditorCommand) => {
    editorRef.current?.runCommand(command);
  }, []);

  function chooseMood(value: number) {
    const next = moodRef.current === value ? null : value;
    moodRef.current = next;
    setMood(next);
    markDirty();
    scheduleAutosave();
  }

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    markDirty();
    scheduleAutosave();
  }

  function applyLink(remove = false) {
    handleCommand(
      remove
        ? { name: 'unlink' }
        : { name: 'link', href: linkUrl.trim() || undefined },
    );
    setLinkOpen(false);
    setLinkUrl('');
    setMoreOpen(false);
  }

  async function insertImage() {
    setImageBusy(true);
    setError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      const prepared = await prepareImage(picked);
      const uploaded = await uploadImage(prepared, 'journal');
      handleCommand({
        name: 'image',
        src: uploaded.url,
        alt: prepared.fileName,
      });
      setStatus('Image uploaded');
    } catch (err) {
      setError(
        isQuotaError(err)
          ? 'Your storage is full. Remove images in Media to make room.'
          : describeError(err),
      );
    } finally {
      setImageBusy(false);
      setMoreOpen(false);
    }
  }

  async function moveToNotebook(id: string) {
    setMoveOpen(false);
    if (id === notebookRef.current) return;
    try {
      if (hasStoredEntryRef.current && date) {
        const api = createDiaryClient();
        await api.moveEntryToNotebook(date, id);
        const [payload] = await api.getEntries([date]);
        if (payload && masterKey) await diaryCache.ingestEntry(payload, masterKey);
        void refreshLocal();
      }
      notebookRef.current = id;
      setNotebookId(id);
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function deleteEntry() {
    if (!date) return;
    setDeleteBusy(true);
    try {
      deletedRef.current = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await diaryCache.deleteEntry(date);
      bumpRevision();
      void refreshLocal();
      setAllowLeave(true);
      router.back();
    } catch (err) {
      setError(describeError(err));
      setDeleteBusy(false);
    }
  }

  async function pullLatest() {
    if (!date || !masterKey) return;
    setError(null);
    try {
      await mobileLocalStore.deleteSyncItem(date);
      await diaryCache.deleteLocalEntry(date);
      await syncNow();
      const entry = await diaryCache.getLocalEntry(date, masterKey);
      applyEntry(entry);
      hasStoredEntryRef.current = Boolean(entry);
      setConflict(null);
      setStatus(entry ? 'Pulled the latest copy' : 'No server copy found');
    } catch (err) {
      setError(describeError(err));
    }
  }

  if (!masterKey) {
    return <Redirect href="/" />;
  }

  if (gate === 'nodate') {
    return (
      <Screen>
        <EmptyState title="No page selected" />
      </Screen>
    );
  }

  if (gate === 'future') {
    return (
      <Screen>
        <EmptyState
          title="The Future is unwritten."
          body="You can only write today or earlier. Return to the present and the page will be waiting."
          action={
            <Button
              label="Return to Present"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            />
          }
        />
      </Screen>
    );
  }

  if (gate === 'sealed') {
    return (
      <Screen>
        <EmptyState
          title="The Archive is sealed."
          body={`This day is older than your ${plan} writing window. Existing pages stay editable, but a new page cannot be started this far back.`}
          action={
            <Button
              label="Back to the archive"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/entries');
              }}
              variant="secondary"
            />
          }
        />
      </Screen>
    );
  }

  if (gate === 'loading' || !initialContent) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.foreground} />
          <ThemedText type="small" themeColor="textSecondary">
            Opening the page…
          </ThemedText>
        </View>
      </Screen>
    );
  }

  const notebookName = notebookId
    ? notebooks.find((notebook) => notebook.id === notebookId)?.name
    : null;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            accessibilityLabel="Back to the archive"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
          >
            <Ionicons color={theme.foreground} name="chevron-back" size={24} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="hand" themeColor="textSecondary">
              {formatDisplayDate(date, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </ThemedText>
          </View>
          {notebooks.length > 1 ? (
            <Pressable
              accessibilityLabel="Move to notebook"
              accessibilityRole="button"
              onPress={() => setMoveOpen(true)}
              style={[
                styles.notebookChip,
                { borderColor: theme.border, backgroundColor: theme.muted },
              ]}
            >
              <ThemedText type="caption" numberOfLines={1}>
                {notebookName ?? 'Notebook'}
              </ThemedText>
            </Pressable>
          ) : null}
          <View style={styles.saveState}>
            {dirty ? (
              <ThemedText type="caption" themeColor="accent">
                •
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Entry actions"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setDeleteOpen(true)}
          >
            <Ionicons
              color={theme.mutedForeground}
              name="ellipsis-horizontal"
              size={20}
            />
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="Entry title"
          onChangeText={changeTitle}
          onSubmitEditing={() => editorRef.current?.focus()}
          placeholder="Untitled Log"
          placeholderTextColor={theme.mutedForeground}
          returnKeyType="next"
          style={[styles.title, { color: theme.foreground, fontFamily: theme.fonts.serif }]}
          value={title}
        />

        <ScrollView
          contentContainerStyle={styles.moodRow}
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          style={styles.moodScroll}
        >
          {MOODS.map((option) => {
            const active = mood === option.value;
            const moodTokens =
              theme.mood[option.value as 1 | 2 | 3 | 4 | 5];
            return (
              <Pressable
                key={option.value}
                accessibilityLabel={`Mood: ${option.label}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => chooseMood(option.value)}
                style={({ pressed }) => [
                  styles.moodButton,
                  {
                    backgroundColor: active
                      ? moodTokens.background
                      : 'transparent',
                    borderColor: active ? moodTokens.solid : theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.moodDot,
                    { backgroundColor: moodTokens.solid },
                  ]}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <EditorToolbar
          onCommand={handleCommand}
          onOpenMore={() => setMoreOpen(true)}
          state={format}
          wordCount={wordCount}
        />

        <RichTextEditor
          editable
          initialContent={initialContent}
          key={editorKey}
          onError={setError}
          onLoaded={handleLoaded}
          onSnapshot={handleSnapshot}
          onStateChange={setFormat}
          ref={editorRef}
          theme={editorTheme}
        />

        {conflict ? (
          <View
            style={[
              styles.conflict,
              { borderColor: theme.destructive, backgroundColor: theme.muted },
            ]}
          >
            <ThemedText type="smallBold">
              This page changed on another device.
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {conflict}
            </ThemedText>
            <View style={styles.conflictActions}>
              <Button
                label="Discard mine & pull"
                onPress={() => void pullLatest()}
                variant="secondary"
              />
              <Button
                label="Keep editing"
                onPress={() => setConflict(null)}
                variant="ghost"
              />
            </View>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            {status ??
              (dirty ? 'Editing…' : 'Everything is saved on this device.')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            disabled={!dirty}
            onPress={() => void persist(true)}
          >
            <ThemedText
              type="smallBold"
              themeColor="accent"
              style={{ opacity: dirty ? 1 : 0.4 }}
            >
              Save
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet
        onClose={() => setMoreOpen(false)}
        title="Formatting"
        visible={moreOpen}
      >
        <FormatRow
          active={format?.isH1}
          label="Heading 1"
          onPress={() => handleCommand({ name: 'heading1' })}
        />
        <FormatRow
          active={format?.isH2}
          label="Heading 2"
          onPress={() => handleCommand({ name: 'heading2' })}
        />
        <FormatRow
          active={format?.isH3}
          label="Heading 3"
          onPress={() => handleCommand({ name: 'heading3' })}
        />
        <FormatRow
          active={format?.isStrike}
          label="Strikethrough"
          onPress={() => handleCommand({ name: 'strike' })}
        />
        <FormatRow
          active={format?.isHighlight}
          label="Highlight"
          onPress={() => handleCommand({ name: 'highlight' })}
        />
        <FormatRow
          active={format?.isOrderedList}
          label="Numbered list"
          onPress={() => handleCommand({ name: 'orderedList' })}
        />
        <FormatRow
          active={format?.isBlockquote}
          label="Blockquote"
          onPress={() => handleCommand({ name: 'blockquote' })}
        />
        <FormatRow
          active={format?.isCodeBlock}
          label="Code block"
          onPress={() => handleCommand({ name: 'codeBlock' })}
        />
        <FormatRow
          label="Divider"
          onPress={() => handleCommand({ name: 'horizontalRule' })}
        />
        <FormatRow
          active={format?.isLink}
          label={format?.isLink ? 'Edit link' : 'Add link'}
          onPress={() => {
            setLinkOpen(true);
            setMoreOpen(false);
          }}
        />
        <FormatRow
          label={imageBusy ? 'Uploading image…' : 'Add image'}
          onPress={() => void insertImage()}
        />
      </Sheet>

      <Sheet onClose={() => setLinkOpen(false)} title="Link" visible={linkOpen}>
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          keyboardType="url"
          label="URL"
          onChangeText={setLinkUrl}
          onSubmitEditing={() => applyLink(false)}
          placeholder="https://"
          value={linkUrl}
        />
        <Button label="Insert link" onPress={() => applyLink(false)} />
        {format?.isLink ? (
          <Button
            label="Remove link"
            onPress={() => applyLink(true)}
            variant="secondary"
          />
        ) : null}
      </Sheet>

      <Sheet
        onClose={() => setMoveOpen(false)}
        title="Move to notebook"
        visible={moveOpen}
      >
        {notebooks.map((notebook) => (
          <Pressable
            key={notebook.id}
            accessibilityRole="button"
            onPress={() => void moveToNotebook(notebook.id)}
            style={({ pressed }) => [
              styles.moveRow,
              {
                borderBottomColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <ThemedText style={styles.flex}>{notebook.name}</ThemedText>
            {notebook.id === notebookId ? (
              <Ionicons color={theme.accent} name="checkmark" size={18} />
            ) : null}
          </Pressable>
        ))}
      </Sheet>

      <ConfirmSheet
        busy={deleteBusy}
        confirmLabel="Delete entry"
        destructive
        message="This removes the page from this device and the server on the next sync. It cannot be undone."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteEntry()}
        title="Delete this reflection?"
        visible={deleteOpen}
      />
    </Screen>
  );
}

function FormatRow({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.formatRow,
        {
          borderBottomColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <ThemedText style={styles.flex}>{label}</ThemedText>
      {active ? (
        <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flex: 1 },
  notebookChip: {
    maxWidth: 120,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  saveState: { minWidth: 8, alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '600',
    paddingVertical: Spacing.two,
  },
  moodScroll: { flexGrow: 0, flexShrink: 0 },
  moodRow: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 36,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
  },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  conflict: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    padding: Spacing.two,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  error: { paddingVertical: Spacing.one },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
