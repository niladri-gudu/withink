import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Redirect,
  useLocalSearchParams,
  usePreventRemove,
  useRouter,
} from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { formatDisplayDate } from "@withink/core";
import type {
  EditorCommand,
  EditorContentInput,
  EditorSnapshot,
  EditorTheme,
  FormatState,
} from "@withink/editor";

import { Spacing } from "@/constants/theme";
import { diaryCache } from "@/lib/diary-cache";
import { getMasterKey } from "@/lib/master-key";
import { useTheme } from "@/hooks/use-theme";
import { EditorToolbar } from "@/components/editor-toolbar";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/rich-text-editor";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";

const AUTOSAVE_MS = 1200;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text → TipTap-compatible HTML for entries saved by the old editor. */
function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const html = paragraphs
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  return html || "";
}

/** Plain-text → TipTap document JSON for entries saved by the old editor. */
function textToJson(text: string): unknown {
  const paragraphs = text.split(/\n{2,}/);
  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph
        ? [{ type: "text", text: paragraph.replace(/\n/g, " ") }]
        : [],
    })),
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Cheap change signature; formatting lives in the HTML. */
function saveSignature(title: string, snapshot: EditorSnapshot | null): string {
  return `${title} | ${snapshot?.html ?? ""} | ${snapshot?.text ?? ""}`;
}

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
  const date = Array.isArray(params.date)
    ? params.date[0]
    : (params.date ?? "");

  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] =
    useState<EditorContentInput | null>(null);
  const [format, setFormat] = useState<FormatState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<RichTextEditorHandle>(null);
  const snapshotRef = useRef<EditorSnapshot | null>(null);
  const titleRef = useRef("");
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editorTheme = useMemo<EditorTheme>(
    () => ({
      text: theme.text,
      background: theme.background,
      muted: theme.textSecondary,
      accent: "#208AEF",
      border: theme.backgroundSelected,
      codeBackground: theme.backgroundElement,
    }),
    [theme],
  );

  useEffect(() => {
    const key = getMasterKey();
    if (!key || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let cancelled = false;
    // Load the local copy first; fetch from the server only when the device
    // has never seen this date.
    void (async () => {
      try {
        const entry = await diaryCache.fetchEntryIfMissing(date, key);
        if (cancelled) return;
        if (entry) {
          const storedTitle = entry.title ?? "";
          setTitle(storedTitle);
          titleRef.current = storedTitle;
          const hasText = entry.contentText.trim().length > 0;
          setInitialContent({
            html:
              entry.contentHtml ||
              (hasText ? textToHtml(entry.contentText) : ""),
            json:
              entry.contentJson &&
              typeof entry.contentJson === "object" &&
              Object.keys(entry.contentJson as Record<string, unknown>).length >
                0
                ? entry.contentJson
                : hasText
                  ? textToJson(entry.contentText)
                  : undefined,
          });
        } else {
          setInitialContent({ html: "" });
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err));
        if (!cancelled) setInitialContent({ html: "" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const persist = useCallback(
    async (announce: boolean, snapshotOverride?: EditorSnapshot | null) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const key = getMasterKey();
      if (!key || !date) return;

      const snapshot = snapshotOverride ?? snapshotRef.current;
      const contentText = snapshot?.text ?? "";
      if (titleRef.current.trim() === "" && contentText.trim() === "") {
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
            contentHtml: snapshot?.html ?? "",
            contentJson: snapshot?.json ?? {},
            mood: null,
          },
          key,
        );
        lastSavedRef.current = saveSignature(titleRef.current, snapshot);
        dirtyRef.current = false;
        setDirty(false);
        setStatus("Saved on this device");
        setError(null);

        const flush = await diaryCache.flushQueue(key);
        // Always update the footer: a silent autosave needs a state change to
        // repaint "Editing…" even when the push is a no-op.
        setStatus(
          flush.failed > 0
            ? "Saved on this device · will sync when back online"
            : announce
              ? "Synced"
              : "Saved on this device",
        );
      } catch (err) {
        setError(describeError(err));
        setStatus(null);
      }
    },
    [date],
  );

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persist(false);
    }, AUTOSAVE_MS);
  }, [persist]);

  const handleSnapshot = useCallback(
    (snapshot: EditorSnapshot) => {
      snapshotRef.current = snapshot;
      dirtyRef.current = true;
      setDirty(true);
      setStatus(null);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  function handleTitleChange(value: string) {
    titleRef.current = value;
    setTitle(value);
    dirtyRef.current = true;
    setDirty(true);
    setStatus(null);
    scheduleAutosave();
  }

  const handleLoaded = useCallback((snapshot: EditorSnapshot) => {
    // Opening a page is not an edit: record the normalized content as the
    // baseline so leaving without changes never queues a pointless push.
    lastSavedRef.current = saveSignature(titleRef.current, snapshot);
  }, []);

  // Save on the way out if anything is still pending.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const current = snapshotRef.current;
      if (
        dirtyRef.current &&
        current &&
        saveSignature(titleRef.current, current) !== lastSavedRef.current
      ) {
        void persist(false, current);
      }
    };
  }, [persist]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Native-stack pops bypass `BackHandler`, so intercept the removal itself:
  // the WebView hands over its last snapshot before the screen unmounts, then
  // `repeat` re-runs the blocked pop.
  usePreventRemove(!allowLeave, ({ repeat }) => {
    void (async () => {
      const snapshot = await editorRef.current?.flush();
      if (snapshot) snapshotRef.current = snapshot;
      const current = snapshot ?? snapshotRef.current;
      if (
        current &&
        saveSignature(titleRef.current, current) !== lastSavedRef.current
      ) {
        await persist(false, current);
      }
      // Keep the prop in sync with the hook's internal state before repeating.
      setAllowLeave(true);
      repeat();
    })();
  });

  const handleCommand = useCallback((command: EditorCommand) => {
    editorRef.current?.runCommand(command);
  }, []);

  if (!getMasterKey()) {
    return <Redirect href="/diary" />;
  }

  if (!date) {
    return (
      <Screen>
        <View style={styles.center}>
          <ThemedText themeColor="textSecondary">No page selected.</ThemedText>
        </View>
      </Screen>
    );
  }

  if (loading || !initialContent) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.text} />
          <ThemedText type="small" themeColor="textSecondary">
            Opening the page…
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleBack}
          >
            <ThemedText type="smallBold">Back</ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDisplayDate(date, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </ThemedText>
        </View>

        <TextInput
          accessibilityLabel="Entry title"
          onChangeText={handleTitleChange}
          onSubmitEditing={() => editorRef.current?.focus()}
          placeholder="Title"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="next"
          style={[styles.title, { color: theme.text }]}
          value={title}
        />

        <EditorToolbar onCommand={handleCommand} state={format} />

        <RichTextEditor
          editable
          initialContent={initialContent}
          onError={setError}
          onLoaded={handleLoaded}
          onSnapshot={handleSnapshot}
          onStateChange={setFormat}
          ref={editorRef}
          theme={editorTheme}
        />

        <View
          style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}
        >
          <ThemedText type="small" themeColor="textSecondary">
            {status ??
              (dirty ? "Editing…" : "Everything is saved on this device.")}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            disabled={!dirty}
            onPress={() => void persist(true)}
          >
            <ThemedText type="smallBold" style={{ opacity: dirty ? 1 : 0.4 }}>
              Save
            </ThemedText>
          </Pressable>
        </View>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    paddingVertical: Spacing.two,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  error: { color: "#b42318", paddingBottom: Spacing.two },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
});
