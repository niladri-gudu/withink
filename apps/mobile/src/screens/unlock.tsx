import { ApiError } from "@withink/api-client";
import type { MobileBootstrap } from "@withink/contracts";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { createDiaryClient } from "@/lib/api";
import {
  decryptText,
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  importKeyFromHex,
  type MasterKey,
} from "@/lib/crypto";
import { setUnlockToken } from "@/lib/session-state";

/**
 * Derives the master key from the diary password, verifies it against the
 * server's verification ciphertext, then exchanges the HKDF proof for a
 * short-lived native unlock token.
 */
export function UnlockGate({
  bootstrap,
  onUnlocked,
}: {
  bootstrap: MobileBootstrap;
  onUnlocked: (masterKey: MasterKey) => void;
}) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length === 0) {
      setError("Enter your diary password.");
      return;
    }
    if (!bootstrap.encryption.verificationCiphertext) {
      setError("This diary isn't set up for encrypted mobile access yet.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const passwordKey = await deriveKeyFromPassword(
        password,
        bootstrap.encryption.encryptionSalt,
        bootstrap.encryption.kdfIterations,
      );
      const masterKeyHex = await decryptText(
        bootstrap.encryption.verificationCiphertext,
        passwordKey,
      );
      const masterKey = await importKeyFromHex(masterKeyHex);
      const proof = await deriveUnlockProofHex(masterKey);
      const result = await createDiaryClient().unlock(proof);

      setUnlockToken(result.token);
      setPassword("");
      onUnlocked(masterKey);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("That password didn't open this diary.");
      }
    } finally {
      setBusy(false);
    }
  }

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
          <ThemedText themeColor="textSecondary">
            {bootstrap.user.email}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="smallBold">Unlock your diary</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your diary password decrypts the key on this device. It is never
            sent anywhere.
          </ThemedText>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Diary password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
            value={password}
          />

          {busy ? (
            <ThemedText type="small" themeColor="textSecondary">
              Opening your diary… strong encryption takes a few seconds on a
              phone.
            </ThemedText>
          ) : null}

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton
            disabled={busy}
            label="Unlock diary"
            loading={busy}
            onPress={() => void submit()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, justifyContent: "center", gap: Spacing.two },
  brand: { letterSpacing: -1.5 },
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  error: { color: "#b42318" },
});
