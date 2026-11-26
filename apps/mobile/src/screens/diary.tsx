import { ApiError } from "@withink/api-client";
import { formatDisplayDate, type SyncListItem } from "@withink/core";
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

export function DiaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [entries, setEntries] = useState<SyncListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await createDiaryClient().getSyncList();
      setEntries([...list].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.status}${err.code ? ` · ${err.code}` : ""} — ${err.message}`
          : err instanceof Error
            ? err.message
            : "Could not reach the sync API.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    // Fetch-on-mount: the sync list is external state owned by the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [session, load]);

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
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
                Reading the shelf…
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
                  {session?.user.email ?? "Signed in"}
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
                {entries.length} {entries.length === 1 ? "page" : "pages"} synced
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Entries arrive as ciphertext. Unlock and decryption land in the
                next slice.
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
            onRefresh={() => void load()}
            tintColor={theme.text}
          />
        }
        renderItem={({ item }) => (
          <View
            style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
          >
            <ThemedText>{formatDisplayDate(item.date)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {new Date(item.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
