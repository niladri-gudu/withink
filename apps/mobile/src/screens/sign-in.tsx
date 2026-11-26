import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

export function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && session) {
    return <Redirect href="/diary" />;
  }

  async function submit() {
    setError(null);
    const address = email.trim();
    if (!address || password.length < 8) {
      setError("Enter your email and a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "sign-up") {
        const created = await authClient.signUp.email({
          email: address,
          password,
          name: address.split("@")[0] || "Friend",
        });
        if (created.error) {
          setError(created.error.message ?? "Could not create that account.");
          return;
        }
      }

      const signedIn = await authClient.signIn.email({
        email: address,
        password,
      });
      if (signedIn.error) {
        setError(signedIn.error.message ?? "Could not sign in.");
        return;
      }

      router.replace("/diary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
    },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.brand}>
            withink.
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.tagline}>
            A quiet place for your mind.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            style={inputStyle}
            value={password}
          />

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={mode === "sign-in" ? "Open my diary" : "Create my diary"}
            loading={busy}
            onPress={() => void submit()}
          />

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setError(null);
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            }}
            style={styles.switch}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {mode === "sign-in"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, justifyContent: "center", gap: Spacing.two },
  brand: { letterSpacing: -1.5 },
  tagline: { fontSize: 16 },
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  error: { color: "#b42318" },
  switch: { alignItems: "center", paddingVertical: Spacing.two },
});
