import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { authClient } from '@/lib/auth-client';

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit() {
    if (!token) return;
    if (password.length < 8) {
      setError('The new password needs at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Keys do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'The reset link is invalid.');
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The reset link is invalid.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.body}>
        {!token ? (
          <>
            <ThemedText type="subtitle">
              Invalid or expired session link
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Request a fresh password reset email and open its link again.
            </ThemedText>
            <Button
              label="Request a new link"
              onPress={() => router.replace('/forgot-password')}
            />
          </>
        ) : done ? (
          <>
            <ThemedText type="subtitle">Credentials updated.</ThemedText>
            <ThemedText themeColor="textSecondary">
              Your sign-in password has been changed. Unlock your diary with the
              new password next time.
            </ThemedText>
            <Button
              label="Sign in"
              onPress={() => router.replace('/sign-in')}
            />
          </>
        ) : (
          <>
            <ThemedText type="subtitle">Choose a new password.</ThemedText>
            <ThemedText themeColor="textSecondary">
              At least 8 characters. This changes only your sign-in password,
              never your diary password.
            </ThemedText>
            <Field
              autoComplete="new-password"
              error={error}
              label="New password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
            <Field
              autoComplete="new-password"
              label="Confirm new password"
              onChangeText={setConfirm}
              onSubmitEditing={() => void submit()}
              secureTextEntry
              value={confirm}
            />
            <Button
              disabled={busy}
              label="Update password"
              loading={busy}
              onPress={() => void submit()}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
