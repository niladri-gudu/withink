import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary } from '@/providers/diary-provider';

/**
 * The diary gate: password unlock with the derivation done on-device, plus the
 * biometric fast path when the user has opted in. No secret ever leaves the
 * phone; the server only receives the HKDF proof.
 */
export function UnlockGate() {
  const theme = useTheme();
  const {
    bootstrap,
    session,
    biometrics,
    biometricEnrolled,
    unlockWithPassword,
    unlockWithBiometrics,
    signOut,
  } = useDiary();
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState<'password' | 'biometric' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submitPassword() {
    if (busy) return;
    setBusy('password');
    setError(null);
    try {
      await unlockWithPassword(password);
      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That password didn't open this diary.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitBiometric() {
    if (busy) return;
    setBusy('biometric');
    setError(null);
    try {
      await unlockWithBiometrics();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Biometric unlock failed.',
      );
    } finally {
      setBusy(null);
    }
  }

  const email = bootstrap?.user.email ?? session?.user.email ?? '';

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.brand}>
            withink.
          </ThemedText>
          <ThemedText themeColor="textSecondary">{email}</ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="smallBold">Unlock your diary</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your diary password decrypts the key on this device. It is never
            sent anywhere.
          </ThemedText>

          {biometricEnrolled ? (
            <>
              <Button
                icon="finger-print-outline"
                label={`Unlock with ${biometrics?.label ?? 'biometrics'}`}
                loading={busy === 'biometric'}
                onPress={() => void submitBiometric()}
              />
              <View style={styles.orRow}>
                <View style={[styles.rule, { backgroundColor: theme.border }]} />
                <ThemedText type="caption" themeColor="textSecondary">
                  or enter your password
                </ThemedText>
                <View style={[styles.rule, { backgroundColor: theme.border }]} />
              </View>
            </>
          ) : null}

          <Field
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            onChangeText={setPassword}
            onSubmitEditing={() => void submitPassword()}
            placeholder="Diary password"
            secureTextEntry
            value={password}
          />

          <Button
            disabled={busy !== null || password.length === 0}
            label="Unlock diary"
            loading={busy === 'password'}
            onPress={() => void submitPassword()}
          />

          {busy === 'password' ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={theme.mutedForeground} size="small" />
              <ThemedText type="caption" themeColor="textSecondary">
                Strong encryption takes a few seconds on a phone.
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void signOut();
            }}
            style={styles.signOut}
          >
            <ThemedText type="small" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  brand: { letterSpacing: -1.5 },
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  signOut: { alignSelf: 'center', paddingVertical: Spacing.two },
});
