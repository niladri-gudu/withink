import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { authClient } from "@/lib/auth-client";

export default function IndexRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return <Redirect href={session ? "/diary" : "/sign-in"} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
