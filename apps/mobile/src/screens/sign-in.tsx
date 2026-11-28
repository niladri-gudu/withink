import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { authClient } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

export function SignInScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && session) {
    return <Redirect href="/" />;
  }

  async function continueWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      // The Expo plugin opens the system browser and deep-links back to
      // `withink://`; the session observer above redirects once it lands.
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (result.error) {
        setError(result.error.message ?? 'Could not start Google sign-in.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not reach the server.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    const address = email.trim();
    if (!address || password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const created = await authClient.signUp.email({
          email: address,
          password,
          name: address.split('@')[0] || 'Friend',
        });
        if (created.error) {
          setError(created.error.message ?? 'Could not create that account.');
          return;
        }
      }

      const signedIn = await authClient.signIn.email({
        email: address,
        password,
      });
      if (signedIn.error) {
        setError(signedIn.error.message ?? 'Could not sign in.');
        return;
      }

      router.replace('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not reach the server.',
      );
    } finally {
      setBusy(false);
    }
  }

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
          <ThemedText type="serif" themeColor="textSecondary">
            A quiet place for your mind.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            onSubmitEditing={() => undefined}
            placeholder="you@example.com"
            value={email}
          />
          <Field
            autoCapitalize="none"
            autoComplete={
              mode === 'sign-in' ? 'current-password' : 'new-password'
            }
            error={error}
            label="Secret key"
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
          />

          <Button
            disabled={busy}
            label={mode === 'sign-in' ? 'Open my diary' : 'Create my diary'}
            loading={busy}
            onPress={() => void submit()}
          />

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.divider}
          >
            or
          </ThemedText>

          <Button
            disabled={busy}
            label="Continue with Google"
            onPress={() => void continueWithGoogle()}
            variant="secondary"
          />

          {mode === 'sign-in' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/forgot-password')}
              style={styles.linkRow}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Forgot your sign-in password?
              </ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setError(null);
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            }}
            style={styles.switch}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {mode === 'sign-in'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
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
  linkRow: { alignItems: 'center' },
  divider: { textAlign: 'center' },
  switch: { alignItems: 'center', paddingVertical: Spacing.two },
});
