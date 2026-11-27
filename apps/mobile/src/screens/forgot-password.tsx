import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';

export function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    const address = email.trim();
    if (!address) {
      setError('Enter the email for your account.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.requestPasswordReset({
        email: address,
        redirectTo: Linking.createURL('/reset-password'),
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Could not send the email.');
      }
      setSentTo(address);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to sign in"
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons color={theme.foreground} name="chevron-back" size={24} />
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">
          Sign in
        </ThemedText>
      </View>

      <View style={styles.body}>
        {sentTo ? (
          <>
            <ThemedText type="subtitle">Check your inbox.</ThemedText>
            <ThemedText themeColor="textSecondary">
              If an account exists for {sentTo}, a reset link is on its way. It
              opens a fresh reset page in this app.
            </ThemedText>
            <Button
              label="Back to sign in"
              onPress={() => router.replace('/sign-in')}
            />
            <Button
              label="Use a different email"
              onPress={() => setSentTo(null)}
              variant="ghost"
            />
          </>
        ) : (
          <>
            <ThemedText type="subtitle">Forgot your password?</ThemedText>
            <ThemedText themeColor="textSecondary">
              We’ll email a single-use link to reset your sign-in password. Your
              diary password is separate and cannot be reset by email.
            </ThemedText>
            <Field
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={error}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              onSubmitEditing={() => void submit()}
              placeholder="you@example.com"
              value={email}
            />
            <Button
              disabled={busy}
              label="Send reset link"
              loading={busy}
              onPress={() => void submit()}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Could not send the reset email.';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
