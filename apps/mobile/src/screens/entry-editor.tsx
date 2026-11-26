import { formatDisplayDate } from "@withink/core";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { diaryCache } from "@/lib/diary-cache";
import { getMasterKey } from "@/lib/master-key";

const AUTOSAVE_MS = 1200;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text → TipTap-compatible HTML (paragraphs split on blank lines). */
function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const html = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return html || "<p></p>";
}

/** Plain-text → TipTap document JSON. */
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

/**
 * Plain-text entry editor for the native client.
 *
 * Writes are local-first: the encrypted document, metadata and queue item go
 * to SQLite on every autosave, then the queue is pushed to the server. Rich
 * formatting is not editable here yet; `contentHtml`/`contentJson` are
 * regenerated from the plain text on save, which is why this screen is marked
 * as a basic editor in the parity matrix.
 */
export function EntryEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const date = Array.isArray(params.date)
    ? params.date[0]
    : (params.date ?? "");

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const latestRef = useRef({ date, title, text });
  // Effects and event handlers read the ref; render reads the state mirror.
  useEffect(() => {
    latestRef.current = { date, title, text };
  }, [date, title, text]);

  useEffect(() => {
    const key = getMasterKey();
    if (!key || !date) {
      // Nothing async to run; flip the spinner off once. The route redirects
      // to the diary anyway when no key is held.
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
          setTitle(entry.title);
          setText(entry.contentText);
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const persist = useCallback(async (announce: boolean) => {
    const key = getMasterKey();
    const latest = latestRef.current;
    if (!key || !latest.date) return;
    if (latest.title.trim() === "" && latest.text.trim() === "") {
      dirtyRef.current = false;
      setDirty(false);
      return;
    }

    try {
      await diaryCache.saveEntryLocally(
        {
          date: latest.date,
          title: latest.title,
          contentText: latest.text,
          contentHtml: textToHtml(latest.text),
          contentJson: textToJson(latest.text),
          mood: null,
        },
        key,
      );
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
  }, []);

  // Autosave after the user stops typing, like the web editor.
  useEffect(() => {
    if (!hydrated || !dirtyRef.current) return;
    const timer = setTimeout(() => void persist(false), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [title, text, hydrated, persist]);

  // Save on the way out (back gesture / navigation).
  useEffect(() => {
    return () => {
      if (dirtyRef.current) void persist(false);
    };
  }, [persist]);

  async function handleBack() {
    if (dirtyRef.current) await persist(false);
    router.back();
  }

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

  if (loading) {
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
            onPress={() => void handleBack()}
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
          onChangeText={(value) => {
            dirtyRef.current = true;
            latestRef.current = { ...latestRef.current, title: value };
            setDirty(true);
            setStatus(null);
            setTitle(value);
          }}
          placeholder="Title"
          placeholderTextColor={theme.textSecondary}
          style={[styles.title, { color: theme.text }]}
          value={title}
        />

        <TextInput
          accessibilityLabel="Entry text"
          multiline
          onChangeText={(value) => {
            dirtyRef.current = true;
            latestRef.current = { ...latestRef.current, text: value };
            setDirty(true);
            setStatus(null);
            setText(value);
          }}
          placeholder="Write what happened…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.body, { color: theme.text }]}
          textAlignVertical="top"
          value={text}
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
            <ThemedText
              type="smallBold"
              style={{ opacity: dirty ? 1 : 0.4 }}
            >
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
  body: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    paddingTop: Spacing.two,
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
