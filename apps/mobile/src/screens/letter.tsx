import { Ionicons } from '@expo/vector-icons';
import type {
  LetterFull,
  LetterMeta,
  SaveLetterRequest,
} from '@withink/api-client';
import {
  ENTITLEMENTS,
  countdownFor,
  formatDisplayDate,
  formatNumericDate,
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
import { decryptText, encryptText } from '@/lib/crypto';
import { countActiveLetters } from '@/lib/letters';
import { loadMediaPreview, localImagePreview } from '@/lib/media-images';
import {
  isQuotaError,
  pickImageFromLibrary,
  prepareImage,
  uploadImage,
} from '@/lib/media-upload';
import { collectMediaSources } from '@/lib/media-url';
import { describeError, useDiary } from '@/providers/diary-provider';

const AUTOSAVE_MS = 1500;

type Mode = 'loading' | 'compose' | 'read' | 'sealed' | 'limit' | 'error';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain-text → TipTap-compatible HTML for letters saved before rich text. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

function textToJson(text: string): unknown {
  return {
    type: 'doc',
    content: text.split(/\n{2,}/).map((paragraph) => ({
      type: 'paragraph',
      content: paragraph
        ? [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }]
        : [],
    })),
  };
}

function isDocument(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Object.keys(value as Record<string, unknown>).length > 0,
  );
}

function wordCountOf(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * One letter, end to end: compose an undelivered letter, or read a delivered
 * one. The server decides delivery from its own `today`; the screen only ever
 * reveals through `POST /api/letters/{id}/reveal`, so opening early is refused
 * by the same rule the web client obeys.
 */
export function LetterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isNew = !rawId || rawId === 'new';
  const letterId = isNew ? null : rawId;

  const { masterKey, plan, bootstrap } = useDiary();
  const accountEncrypted = bootstrap?.encryption.isClientEncrypted ?? false;

  const [mode, setMode] = React.useState<Mode>('loading');
  const [meta, setMeta] = React.useState<LetterMeta | null>(null);
  const [today, setToday] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [plainText, setPlainText] = React.useState('');
  const [unlockDate, setUnlockDate] = React.useState('');
  const [initialContent, setInitialContent] =
    React.useState<EditorContentInput | null>(null);
  const [imageSources, setImageSources] = React.useState<
    Record<string, string>
  >({});
  const [imageBusy, setImageBusy] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);
  const [format, setFormat] = React.useState<FormatState | null>(null);
  const [wordCount, setWordCount] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [allowLeave, setAllowLeave] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [dateOpen, setDateOpen] = React.useState(false);
  const [sealOpen, setSealOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [monthCursor, setMonthCursor] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const editorRef = React.useRef<RichTextEditorHandle>(null);
  const snapshotRef = React.useRef<EditorSnapshot | null>(null);
  const titleRef = React.useRef('');
  const unlockDateRef = React.useRef('');
  const letterIdRef = React.useRef<string | null>(letterId);
  const dirtyRef = React.useRef(false);
  const lastSavedRef = React.useRef('');
  const savingRef = React.useRef(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const deletedRef = React.useRef(false);
  const persistRef = React.useRef<(announce?: boolean) => Promise<boolean>>(
    async () => false,
  );

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

  const decryptContent = React.useCallback(
    async (letter: LetterFull) => {
      if (!accountEncrypted || !masterKey) {
        return {
          title: letter.title,
          html: letter.contentHtml,
          text: letter.contentText,
          json: isDocument(letter.contentJson) ? letter.contentJson : null,
        };
      }
      const plainTitle = await decryptText(letter.title, masterKey);
      const text = await decryptText(letter.contentText, masterKey);
      const html = await decryptText(letter.contentHtml, masterKey);
      let json: unknown = null;
      if (typeof letter.contentJson === 'string') {
        const plain = await decryptText(letter.contentJson, masterKey);
        try {
          const parsed: unknown = JSON.parse(plain);
          json = isDocument(parsed) ? parsed : null;
        } catch {
          json = null;
        }
      } else if (isDocument(letter.contentJson)) {
        json = letter.contentJson;
      }
      return { title: plainTitle, html, text, json };
    },
    [accountEncrypted, masterKey],
  );

  const applyContent = React.useCallback(
    (content: {
      title: string;
      html: string;
      text: string;
      json: unknown;
    }) => {
      titleRef.current = content.title;
      setTitle(content.title);
      const hasText = content.text.trim().length > 0;
      setInitialContent({
        html: content.html || (hasText ? textToHtml(content.text) : ''),
        json: isDocument(content.json)
          ? content.json
          : hasText
            ? textToJson(content.text)
            : undefined,
      });
      setEditorKey((value) => value + 1);
      setPlainText(content.text);
      setWordCount(wordCountOf(content.text));
    },
    [],
  );

  function setMonthTo(date: string) {
    const [year, month] = date.split('-').map(Number);
    if (year && month) setMonthCursor({ year, month: month - 1 });
  }

  React.useEffect(() => {
    if (!masterKey) return;
    let cancelled = false;
    void (async () => {
      setMode('loading');
      setError(null);
      try {
        const client = createDiaryClient();
        if (isNew) {
          const list = await client.getLetters();
          if (cancelled) return;
          setToday(list.today);
          const limit = ENTITLEMENTS[plan].futureLetterLimit;
          const active = countActiveLetters(list.letters, list.today);
          if (Number.isFinite(limit) && active >= limit) {
            setMode('limit');
            return;
          }
          letterIdRef.current = null;
          unlockDateRef.current = '';
          setUnlockDate('');
          setTitle('');
          applyContent({ title: '', html: '', text: '', json: null });
          setMode('compose');
          return;
        }

        try {
          const { letter, today: serverToday } = await client.getLetter(
            letterId as string,
          );
          if (cancelled) return;
          setToday(serverToday);
          setMeta(letter);
          letterIdRef.current = letter.id;
          unlockDateRef.current = letter.unlockDate;
          setUnlockDate(letter.unlockDate);
          setMonthTo(letter.unlockDate);

          if (letter.unlockDate <= serverToday) {
            const revealed = await client.revealLetter(letter.id);
            if (cancelled) return;
            setMeta(revealed);
            applyContent(await decryptContent(revealed));
            setMode('read');
          } else {
            applyContent(await decryptContent(letter));
            setMode('compose');
          }
        } catch (err) {
          if ((err as { code?: string }).code !== 'LETTER_SEALED') throw err;
          const list = await client.getLetters();
          if (cancelled) return;
          setToday(list.today);
          const found =
            list.letters.find((item) => item.id === letterId) ?? null;
          setMeta(found);
          if (found) {
            unlockDateRef.current = found.unlockDate;
            setUnlockDate(found.unlockDate);
            setMonthTo(found.unlockDate);
            const plain =
              accountEncrypted && masterKey
                ? await decryptText(found.title, masterKey).catch(() => '')
                : found.title;
            titleRef.current = plain;
            setTitle(plain);
          }
          setMode('sealed');
        }
      } catch (err) {
        if (cancelled) return;
        setError(describeError(err));
        setMode('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applyContent,
    accountEncrypted,
    decryptContent,
    isNew,
    letterId,
    masterKey,
    plan,
  ]);

  async function buildPayload(): Promise<SaveLetterRequest | null> {
    const date = unlockDateRef.current;
    if (!date) return null;
    const snapshot = snapshotRef.current;
    const plainTitle = titleRef.current;
    const text = snapshot?.text ?? '';
    if (!plainTitle.trim() && !text.trim()) return null;
    const html = snapshot?.html ?? '';
    const json = snapshot?.json ?? { type: 'doc', content: [] };
    const base = {
      letterId: letterIdRef.current ?? undefined,
      unlockDate: date,
      sealed: false,
      wordCount: snapshot?.wordCount ?? wordCountOf(text),
    };
    if (!accountEncrypted || !masterKey) {
      return {
        ...base,
        title: plainTitle,
        contentHtml: html,
        contentText: text,
        contentJson: json,
      };
    }
    return {
      ...base,
      title: await encryptText(plainTitle, masterKey),
      contentHtml: await encryptText(html, masterKey),
      contentText: await encryptText(text, masterKey),
      contentJson: await encryptText(JSON.stringify(json), masterKey),
    };
  }

  function signature(): string {
    return `${titleRef.current} | ${unlockDateRef.current} | ${
      snapshotRef.current?.html ?? ''
    } | ${snapshotRef.current?.text ?? ''}`;
  }

  async function persist(announce = false): Promise<boolean> {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!masterKey || deletedRef.current) return false;
    if (savingRef.current) return false;
    const current = signature();
    if (letterIdRef.current && current === lastSavedRef.current) {
      dirtyRef.current = false;
      setDirty(false);
      if (announce) setStatus('Saved');
      return true;
    }
    const payload = await buildPayload();
    if (!payload) return false;

    savingRef.current = true;
    setStatus('Saving…');
    try {
      const saved = await createDiaryClient().saveLetter(payload);
      letterIdRef.current = saved.id;
      lastSavedRef.current = current;
      dirtyRef.current = false;
      setDirty(false);
      setMeta(saved);
      setStatus(announce ? 'Saved' : 'Saved for its day');
      setError(null);
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'LETTER_LIMIT_REACHED') {
        setLimitOpen(true);
        setStatus(null);
      } else if (code === 'LETTER_FROZEN') {
        setError(
          'This letter already rests or has opened, so it can no longer change.',
        );
      } else {
        setError(describeError(err));
        setStatus('Not saved');
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }
  persistRef.current = persist;

  function scheduleAutosave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      if (savingRef.current) {
        scheduleAutosave();
        return;
      }
      void persistRef.current(false);
    }, AUTOSAVE_MS);
  }

  function markDirty() {
    dirtyRef.current = true;
    setDirty(true);
    setStatus(null);
  }

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    markDirty();
    scheduleAutosave();
  }

  function handleSnapshot(snapshot: EditorSnapshot) {
    snapshotRef.current = snapshot;
    setWordCount(snapshot.wordCount);
    markDirty();
    scheduleAutosave();
  }

  function handleLoaded(snapshot: EditorSnapshot) {
    snapshotRef.current = snapshot;
    setWordCount(snapshot.wordCount);
    lastSavedRef.current = signature();
    dirtyRef.current = false;
    setDirty(false);
  }

  function pickDate(date: string) {
    unlockDateRef.current = date;
    setUnlockDate(date);
    setDateOpen(false);
    markDirty();
    scheduleAutosave();
  }

  function handleCommand(command: EditorCommand) {
    editorRef.current?.runCommand(command);
  }

  /** Same chain as the journal editor: upload first, then insert the node. */
  async function insertImage() {
    setImageBusy(true);
    setError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      const prepared = await prepareImage(picked);
      const uploaded = await uploadImage(prepared, 'journal');
      const preview = await localImagePreview(prepared.uri);
      if (preview) {
        setImageSources((current) => ({
          ...current,
          [uploaded.url]: preview,
        }));
        editorRef.current?.addImageSource(uploaded.url, preview);
      }
      handleCommand({
        name: 'image',
        src: uploaded.url,
        alt: prepared.fileName,
      });
      setStatus('Image added');
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

  React.useEffect(() => {
    if (!initialContent) return;
    const sources = collectMediaSources(
      initialContent.html ?? '',
      initialContent.json,
    );
    if (sources.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const src of sources) {
        const dataUri = await loadMediaPreview(src);
        if (cancelled || !dataUri) continue;
        setImageSources((existing) =>
          existing[src] ? existing : { ...existing, [src]: dataUri },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialContent]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (dirtyRef.current && !deletedRef.current && !savingRef.current) {
        void persistRef.current(false);
      }
    };
  }, []);

  usePreventRemove(mode === 'compose' && !allowLeave, ({ repeat }) => {
    void (async () => {
      const snapshot = await editorRef.current?.flush();
      if (snapshot) snapshotRef.current = snapshot;
      if (dirtyRef.current) await persistRef.current(false);
      setAllowLeave(true);
      repeat();
    })();
  });

  async function sealLetter() {
    setBusy(true);
    setError(null);
    const snapshot = await editorRef.current?.flush();
    if (snapshot) snapshotRef.current = snapshot;
    let saved = await persistRef.current(true);
    if (!saved && savingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      saved = await persistRef.current(true);
    }
    const id = letterIdRef.current;
    if (!saved || !id) {
      setError("The letter wasn't saved, so it wasn't sealed. Try again.");
      setBusy(false);
      return;
    }
    try {
      await createDiaryClient().sealLetter(id);
      setSealOpen(false);
      setAllowLeave(true);
      router.replace('/letters');
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  async function deleteLetter() {
    setBusy(true);
    try {
      if (letterIdRef.current) {
        await createDiaryClient().deleteLetter(letterIdRef.current);
      }
      deletedRef.current = true;
      setDeleteOpen(false);
      setAllowLeave(true);
      router.replace('/letters');
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/letters');
  }

  if (mode === 'loading') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.foreground} />
          <ThemedText type="small" themeColor="textSecondary">
            Opening the letter…
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (mode === 'error') {
    return (
      <Screen>
        <EmptyState
          title="The letter couldn't be opened"
          body={error ?? 'Try again in a moment.'}
          action={<Button label="Back to letters" onPress={goBack} />}
        />
      </Screen>
    );
  }

  if (mode === 'limit') {
    return (
      <Screen>
        <EmptyState
          title="Every slot is holding a letter"
          body={
            Number.isFinite(ENTITLEMENTS[plan].futureLetterLimit)
              ? `Your ${plan} plan carries ${ENTITLEMENTS[plan].futureLetterLimit} letters at a time. A letter frees its slot the day it opens.`
              : 'Your plan carries unlimited letters.'
          }
          action={<Button label="Back to letters" onPress={goBack} />}
        />
      </Screen>
    );
  }

  if (mode === 'read' || mode === 'sealed') {
    const countdown = countdownFor(unlockDate, today);
    const paragraphs = plainText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.readContent}>
          <View style={styles.readHeader}>
            <Pressable
              accessibilityLabel="Back to letters"
              accessibilityRole="button"
              hitSlop={12}
              onPress={goBack}
            >
              <Ionicons
                color={theme.foreground}
                name="chevron-back"
                size={24}
              />
            </Pressable>
            <ThemedText type="hand" themeColor="textSecondary">
              {mode === 'sealed' ? 'resting until its day' : 'a letter for you'}
            </ThemedText>
            <Pressable
              accessibilityLabel="Letter actions"
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

          <ThemedText type="title">
            {title.trim() || 'An untitled letter'}
          </ThemedText>
          <ThemedText type="small" themeColor="accent">
            {formatDisplayDate(unlockDate)} · {countdown.label}
          </ThemedText>

          {mode === 'sealed' ? (
            <View
              style={[
                styles.sealedCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.muted,
                },
              ]}
            >
              <ThemedText type="heading">Still sealed</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                This letter opens on {formatDisplayDate(unlockDate)}. Until
                then it can&apos;t be read or edited — but it can still be
                deleted.
              </ThemedText>
            </View>
          ) : paragraphs.length === 0 ? (
            <ThemedText type="hand" themeColor="textSecondary">
              (This letter is still empty — the words never made it onto the
              page.)
            </ThemedText>
          ) : (
            paragraphs.map((paragraph, index) => (
              <ThemedText key={index} type="serif" style={styles.paragraph}>
                {index === 0 ? (
                  <>
                    <ThemedText type="serif" style={styles.dropCap}>
                      {paragraph.slice(0, 1)}
                    </ThemedText>
                    {paragraph.slice(1)}
                  </>
                ) : (
                  paragraph
                )}
              </ThemedText>
            ))
          )}

          {error ? (
            <ThemedText type="small" themeColor="destructive">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <ConfirmSheet
          busy={busy}
          confirmLabel="Delete letter"
          destructive
          message="Everything written in it will be gone for good."
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void deleteLetter()}
          title="Delete this letter?"
          visible={deleteOpen}
        />
      </Screen>
    );
  }

  const pickerToday = today || getLocalDateString();
  const countdown = unlockDate ? countdownFor(unlockDate, pickerToday) : null;
  const canSeal =
    Boolean(unlockDate) && (title.trim().length > 0 || wordCount > 0);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            accessibilityLabel="Back to letters"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
          >
            <Ionicons color={theme.foreground} name="chevron-back" size={24} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="hand" themeColor="textSecondary">
              {meta ? 'an unfinished letter' : 'a letter in the making'}
            </ThemedText>
          </View>
          <View style={styles.saveState}>
            <ThemedText type="caption" themeColor="accent">
              {dirty ? '•' : ''}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Letter actions"
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
          accessibilityLabel="Letter title"
          onChangeText={changeTitle}
          onSubmitEditing={() => editorRef.current?.focus()}
          placeholder="Dear future me…"
          placeholderTextColor={theme.mutedForeground}
          returnKeyType="next"
          style={[
            styles.title,
            { color: theme.foreground, fontFamily: theme.fonts.serif },
          ]}
          value={title}
        />

        <Pressable
          accessibilityLabel="Choose the day this letter opens"
          accessibilityRole="button"
          onPress={() => setDateOpen(true)}
          style={({ pressed }) => [
            styles.dateChip,
            {
              borderColor: unlockDate ? theme.accent : theme.border,
              backgroundColor: theme.muted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            color={unlockDate ? theme.accent : theme.mutedForeground}
            name="calendar-outline"
            size={16}
          />
          <ThemedText type="small">
            {unlockDate
              ? `opens ${formatNumericDate(unlockDate)}`
              : 'Choose the day it opens'}
          </ThemedText>
          {countdown ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {countdown.label}
            </ThemedText>
          ) : null}
        </Pressable>

        <EditorToolbar
          onCommand={handleCommand}
          onOpenMore={() => setMoreOpen(true)}
          state={format}
          wordCount={wordCount}
        />

        {initialContent ? (
          <RichTextEditor
            editable
            imageSources={imageSources}
            initialContent={initialContent}
            key={editorKey}
            onError={setError}
            onLoaded={handleLoaded}
            onSnapshot={handleSnapshot}
            onStateChange={setFormat}
            ref={editorRef}
            theme={editorTheme}
          />
        ) : null}

        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            {status ??
              (dirty ? 'Editing…' : 'Saved as a draft until you seal it.')}
          </ThemedText>
          <Button
            disabled={!canSeal || busy}
            label="Seal letter"
            loading={busy}
            onPress={() => setSealOpen(true)}
          />
        </View>
      </KeyboardAvoidingView>

      <Sheet
        onClose={() => setDateOpen(false)}
        title="When should it open?"
        visible={dateOpen}
      >
        <View style={styles.monthHead}>
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              setMonthCursor(({ year, month }) =>
                month === 0
                  ? { year: year - 1, month: 11 }
                  : { year, month: month - 1 },
              )
            }
          >
            <Ionicons
              color={theme.foreground}
              name="chevron-back"
              size={20}
            />
          </Pressable>
          <ThemedText type="smallBold">
            {new Date(
              monthCursor.year,
              monthCursor.month,
              1,
            ).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </ThemedText>
          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              setMonthCursor(({ year, month }) =>
                month === 11
                  ? { year: year + 1, month: 0 }
                  : { year, month: month + 1 },
              )
            }
          >
            <Ionicons
              color={theme.foreground}
              name="chevron-forward"
              size={20}
            />
          </Pressable>
        </View>
        <DateGrid
          month={monthCursor.month}
          onPick={pickDate}
          selected={unlockDate}
          today={pickerToday}
          year={monthCursor.year}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          A letter opens on its day and never before. Pick a day after today.
        </ThemedText>
      </Sheet>

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
        onClose={() => setLimitOpen(false)}
        title="Letters limit"
        visible={limitOpen}
      >
        <ThemedText themeColor="textSecondary">
          You are holding every letter this plan can carry. Open or delete one
          before writing another.
        </ThemedText>
        <Button label="Close" onPress={() => setLimitOpen(false)} />
      </Sheet>

      <ConfirmSheet
        busy={busy}
        confirmLabel="Seal it"
        message={`It opens on ${
          unlockDate ? formatDisplayDate(unlockDate) : 'its day'
        }. Once sealed it can't be read or edited until then — deleting it stays possible.`}
        onCancel={() => setSealOpen(false)}
        onConfirm={() => void sealLetter()}
        title="Seal this letter?"
        visible={sealOpen}
      />

      <ConfirmSheet
        busy={busy}
        confirmLabel="Delete letter"
        destructive
        message="Everything written in it will be gone for good. Its active slot is freed immediately."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteLetter()}
        title="Delete this letter?"
        visible={deleteOpen}
      />
    </Screen>
  );
}

function DateGrid({
  year,
  month,
  today,
  selected,
  onPick,
}: {
  year: number;
  month: number;
  today: string;
  selected: string;
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
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(
          day,
        ).padStart(2, '0')}`;
        const past = date <= today;
        const isSelected = date === selected;
        return (
          <Pressable
            key={date}
            accessibilityLabel={formatDisplayDate(date)}
            accessibilityRole="button"
            accessibilityState={{ disabled: past, selected: isSelected }}
            disabled={past}
            onPress={() => onPick(date)}
            style={[
              styles.cell,
              styles.dayCell,
              isSelected && {
                borderColor: theme.accent,
                borderWidth: 1,
                backgroundColor: theme.muted,
              },
              { opacity: past ? 0.25 : 1 },
            ]}
          >
            <ThemedText
              type="caption"
              themeColor={isSelected ? 'accent' : 'textSecondary'}
            >
              {day}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  saveState: { width: 12, alignItems: 'center' },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '600',
    paddingVertical: Spacing.three,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readContent: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  readHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sealedCard: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.xl,
    padding: Spacing.three,
  },
  paragraph: { lineHeight: 28 },
  dropCap: { fontSize: 34, lineHeight: 34, fontWeight: '600' },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  dayCell: {
    aspectRatio: 1,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
});
