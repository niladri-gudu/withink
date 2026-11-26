import { ApiError } from "@withink/api-client";
import type { MobileBootstrap } from "@withink/contracts";
import { formatDisplayDate, getLocalDateString } from "@withink/core";
import type { CachedEntryMetadata } from "@withink/core/timeline";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { createDiaryClient } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { diaryCache } from "@/lib/diary-cache";
import type { MasterKey } from "@/lib/crypto";
import { mobileLocalStore } from "@/lib/local-store";
import {
  clearMasterKey,
  setMasterKey as rememberMasterKey,
} from "@/lib/master-key";
import { clearUnlockToken } from "@/lib/session-state";

import { UnlockGate } from "./unlock";

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.status}${error.code ? ` · ${error.code}` : ""} — ${error.message}`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function DiaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();

  const [bootstrap, setBootstrap] = useState<MobileBootstrap | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<MasterKey | null>(null);
  const [entries, setEntries] = useState<CachedEntryMetadata[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setBootstrapError(null);
    try {
      setBootstrap(await createDiaryClient().getBootstrap());
    } catch (err) {
      setBootstrapError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reads the SQLite cache only — cheap, used when returning from the editor. */
  const loadLocal = useCallback(async (key: MasterKey) => {
    const [timeline, queued] = await Promise.all([
      diaryCache.getLocalTimeline(key),
      diaryCache.pendingCount(),
    ]);
    setEntries(timeline);
    setPending(queued);
  }, []);

  /** Push queued edits, pull newer pages, then read the cache. */
  const syncAndLoad = useCallback(
    async (key: MasterKey) => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const result = await diaryCache.sync(key);
        if (result.lastError) {
          setNotice("Offline — showing the pages saved on this device.");
        } else if (result.failed > 0) {
          setNotice("Some pages are saved on this device and will sync later.");
        }
      } catch (err) {
        setNotice("Offline — showing the pages saved on this device.");
        setError(describeError(err));
      } finally {
        await loadLocal(key);
        setLoading(false);
      }
    },
    [loadLocal],
  );

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    // Fetch-on-mount: the bootstrap is external state owned by the server.
    // Depend on the user id, not the session object, so auth-store updates do
    // not re-trigger the bootstrap read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBootstrap();
  }, [userId, loadBootstrap]);

  // Returning from the editor should reflect the new local copy immediately.
  useFocusEffect(
    useCallback(() => {
      if (masterKey) void loadLocal(masterKey);
    }, [masterKey, loadLocal]),
  );

  const handleUnlocked = useCallback(
    (key: MasterKey) => {
      rememberMasterKey(key);
      setMasterKey(key);
      void syncAndLoad(key);
    },
    [syncAndLoad],
  );

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  async function signOut() {
    clearUnlockToken();
    clearMasterKey();
    setMasterKey(null);
    setEntries([]);
    // The encrypted cache is account-scoped only by convention; purge it so a
    // different account on the same device never sees another user's pages.
    await mobileLocalStore.clear();
    await authClient.signOut();
    router.replace("/sign-in");
  }

  function openToday() {
    router.push({
      pathname: "/entry/[date]",
      params: { date: getLocalDateString() },
    });
  }

  if (!bootstrap) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.text} />
          <ThemedText type="small" themeColor="textSecondary">
            {bootstrapError ? bootstrapError : "Opening your shelf…"}
          </ThemedText>
          {bootstrapError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadBootstrap()}
            >
              <ThemedText type="smallBold">Try again</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Screen>
    );
  }

  if (!bootstrap.encryption.isClientEncrypted) {
    return (
      <Screen>
        <View style={styles.center}>
          <ThemedText type="subtitle">Legacy diary</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            This account still uses the server-side diary format. Open it on the
            web to migrate to an encrypted diary, then come back.
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => void signOut()}>
            <ThemedText type="smallBold">Sign out</ThemedText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!masterKey) {
    return <UnlockGate bootstrap={bootstrap} onUnlocked={handleUnlocked} />;
  }

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.date}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.text} />
              <ThemedText type="small" themeColor="textSecondary">
                Opening your pages…
              </ThemedText>
            </View>
          ) : error ? undefined : (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary">
                No entries yet. Your first page is one tap away.
              </ThemedText>
              <Pressable accessibilityRole="button" onPress={openToday}>
                <ThemedText type="smallBold">
                  Write today&apos;s page
                </ThemedText>
              </Pressable>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText type="subtitle">Your diary</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {bootstrap.user.email}
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={openToday}
              style={({ pressed }) => [
                styles.newPage,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <ThemedText type="smallBold">New page</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDisplayDate(getLocalDateString(), {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </ThemedText>
            </Pressable>

            <View
              style={[
                styles.notice,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText type="smallBold">
                {entries.length === 0
                  ? "No pages yet"
                  : `${entries.length} ${
                      entries.length === 1 ? "page" : "pages"
                    } on this device`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {pending > 0
                  ? `${pending} ${pending === 1 ? "page" : "pages"} waiting to sync.`
                  : "Encrypted on this device. The master key stays in memory."}
              </ThemedText>
              {notice ? (
                <ThemedText type="small" style={styles.noticeWarn}>
                  {notice}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={styles.signOut}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Sign out
              </ThemedText>
            </Pressable>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && entries.length > 0}
            onRefresh={() => void syncAndLoad(masterKey)}
            tintColor={theme.text}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/entry/[date]",
                params: { date: item.date },
              })
            }
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: theme.backgroundSelected,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowHeader}>
              <ThemedText type="smallBold" style={styles.rowTitle}>
                {item.title || "Untitled"}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDisplayDate(item.date, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </ThemedText>
            </View>
            {item.snippet ? (
              <ThemedText
                numberOfLines={2}
                type="small"
                themeColor="textSecondary"
              >
                {item.snippet}
              </ThemedText>
            ) : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.five, flexGrow: 1 },
  header: { gap: Spacing.three, paddingTop: Spacing.four },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerText: { flex: 1, gap: 2 },
  newPage: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: 2,
  },
  notice: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  noticeWarn: { color: "#b54708" },
  error: { color: "#b42318" },
  signOut: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  row: {
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  rowTitle: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: "center" },
});
