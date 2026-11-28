import { KDF_ITERATIONS, countWords } from '@withink/core';
import * as Crypto from 'expo-crypto';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, SectionLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { createDiaryClient } from '@/lib/api';
import {
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  encryptText,
  exportKeyToHex,
  generateMasterKey,
} from '@/lib/crypto';
import { mobileLocalStore } from '@/lib/local-store';
import { describeError, useDiary } from '@/providers/diary-provider';

/** 16 random bytes as 32 lowercase hex characters. */
function randomSalt(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * One-way migration for accounts still on the server-side diary format. The
 * pages are decrypted server-side only for this request, re-encrypted on the
 * device, and the account flips to zero-knowledge at the end. There is no
 * in-app way back.
 */
export function LegacyMigrationScreen() {
  const { completeMigration, reloadBootstrap, signOut, bumpRevision } =
    useDiary();

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function enable() {
    setError(null);
    if (password.length < 8) {
      setError('Choose a diary password of at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The diary passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      setStep('Reading your pages…');
      const migration = await createDiaryClient().getMigrationPlaintext();

      setStep('Deriving your diary key…');
      const salt = randomSalt();
      const passwordKey = await deriveKeyFromPassword(
        password,
        salt,
        KDF_ITERATIONS,
      );
      const masterKey = await generateMasterKey();
      const masterKeyHex = await exportKeyToHex(masterKey);
      const verificationCiphertext = await encryptText(
        masterKeyHex,
        passwordKey,
      );

      setStep('Encrypting your pages…');
      const encrypted = [];
      for (const entry of migration.entries) {
        encrypted.push({
          id: entry.id,
          title: await encryptText(entry.title, masterKey),
          contentHtml: await encryptText(entry.contentHtml, masterKey),
          contentText: await encryptText(entry.contentText, masterKey),
          contentJson: await encryptText(
            JSON.stringify(entry.contentJson ?? {}),
            masterKey,
          ),
          wordCount: countWords(entry.contentText),
        });
      }

      setStep('Turning on zero-knowledge encryption…');
      const unlockProof = await deriveUnlockProofHex(masterKey);
      await createDiaryClient().mutateEncryption({
        action: 'enable',
        salt,
        verificationCiphertext,
        entries: encrypted,
        unlockProof,
        kdfIterations: KDF_ITERATIONS,
      });

      setStep('Refreshing this device…');
      await reloadBootstrap();
      await mobileLocalStore.clearEntries();
      bumpRevision();
      await completeMigration(masterKey);
    } catch (err) {
      setError(describeError(err));
      setStep(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            Legacy diary
          </ThemedText>
          <ThemedText type="subtitle">Move your journal to this device</ThemedText>
        </View>

        <Card style={styles.gap}>
          <ThemedText type="small">
            This account still uses the server-side diary format. You can
            migrate it here now: every page is re-encrypted on this device with a
            diary password only you know.
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Your diary password is separate from your sign-in password. It never
            leaves this device, and there is no recovery if you forget it.
          </ThemedText>
        </Card>

        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}
        {step ? (
          <ThemedText type="small" themeColor="accent">
            {step}
          </ThemedText>
        ) : null}

        <SectionLabel>New diary password</SectionLabel>
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          label="Diary password"
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
        />
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          label="Confirm diary password"
          onChangeText={setConfirm}
          secureTextEntry
          value={confirm}
        />

        <Button
          disabled={busy || !password || !confirm}
          label={busy ? 'Migrating…' : 'Encrypt my journal'}
          loading={busy}
          onPress={() => void enable()}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          Key derivation runs on this device and can take a few seconds on older
          phones. Keep the app open until it finishes.
        </ThemedText>

        <Button
          disabled={busy}
          label="Sign out"
          onPress={() => void signOut()}
          variant="secondary"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingVertical: Spacing.five },
  heading: { gap: Spacing.one },
  gap: { gap: Spacing.two },
});
