import { ApiError } from "@withink/api-client";
import type { MobileBootstrap } from "@withink/contracts";
import { formatDisplayDate, SYNC_BULK_LIMIT } from "@withink/core";
import { Redirect, useRouter } from "expo-router";
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
import { decryptText, type MasterKey } from "@/lib/crypto";
import { clearUnlockToken } from "@/lib/session-state";

import { UnlockGate } from "./unlock";

interface DecryptedEntry {
  date: string;
  title: string;
  text: string;
  updatedAt: string;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.status}${error.code ? ` · ${error.code}` : ""} — ${error.message}`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function decryptField(value: string, key: MasterKey): Promise<string> {
  try {
    return await decryptText(value, key);
  } catch {
    return "";
  }
}

export function DiaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();

  const [bootstrap, setBootstrap] = useState<MobileBootstrap | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<MasterKey | null>(null);
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const loadEntries = useCallback(async (key: MasterKey) => {
    setLoading(true);
    setError(null);
    try {
      const client = createDiaryClient();
      const manifest = await client.getSyncList();
      setTotal(manifest.length);

      const dates = [...manifest]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, SYNC_BULK_LIMIT)
        .map((item) => item.date);

      if (dates.length === 0) {
        setEntries([]);
        return;
      }

      const pulled = await client.getEntries(dates);
      const decrypted = await Promise.all(
        pulled.map(async (entry) => ({
          date: entry.date,
          title: await decryptField(entry.title, key),
          text: await decryptField(entry.contentText, key),
          updatedAt: entry.updatedAt,
        })),
      );
      setEntries(decrypted.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    // Fetch-on-mount: the bootstrap is external state owned by the server.
    // Depend on the user id, not the session object, so auth-store updates do
    // not re-trigger the bootstrap read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBootstrap();
  }, [userId, loadBootstrap]);

  const handleUnlocked = useCallback(
    (key: MasterKey) => {
      setMasterKey(key);
      void loadEntries(key);
    },
    [loadEntries],
  );

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  async function signOut() {
    clearUnlockToken();
    setMasterKey(null);
    setEntries([]);
    await authClient.signOut();
    router.replace("/sign-in");
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
            <Pressable accessibilityRole="button" onPress={() => void loadBootstrap()}>
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

  const shown = Math.min(total, SYNC_BULK_LIMIT);

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
                Decrypting your pages…
              </ThemedText>
            </View>
          ) : error ? undefined : (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary">
                No entries yet. Your first page is waiting on the web.
              </ThemedText>
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

            <View
              style={[
                styles.notice,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText type="smallBold">
                {total === 0
                  ? "No pages yet"
                  : `${shown}${total > shown ? ` of ${total}` : ""} ${
                      total === 1 ? "page" : "pages"
                    } decrypted`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {total > shown
                  ? `Showing the ${shown} most recent pages.`
                  : "Decrypted on this device. The master key stays in memory."}
              </ThemedText>
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
            onRefresh={() => void loadEntries(masterKey)}
            tintColor={theme.text}
          />
        }
        renderItem={({ item }) => (
          <View
            style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
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
            {item.text ? (
              <ThemedText
                numberOfLines={2}
                type="small"
                themeColor="textSecondary"
              >
                {item.text}
              </ThemedText>
            ) : null}
          </View>
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
  notice: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
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
