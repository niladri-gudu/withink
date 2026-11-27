import { Ionicons } from '@expo/vector-icons';
import { KDF_ITERATIONS } from '@withink/core';
import type { EncryptionSettingsView, LockSettingsView } from '@withink/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  Chip,
  Field,
  ListRow,
  SectionLabel,
  Sheet,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';
import { createDiaryClient } from '@/lib/api';
import {
  decryptText,
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  encryptText,
  importKeyFromHex,
} from '@/lib/crypto';
import { describeError, useDiary } from '@/providers/diary-provider';

const AUTO_LOCK = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
  { value: 86400, label: '24 hours' },
] as const;

const PIN_PATTERN = /^\d{4,6}$/;

export function SecuritySettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    masterKey,
    bootstrap,
    lockPrefs,
    reloadBootstrap,
    biometrics,
    biometricEnrolled,
    enrollBiometrics,
    disableBiometrics,
    lock,
  } = useDiary();

  const [lockEnabled, setLockEnabled] = React.useState(false);
  const [pin, setPin] = React.useState('');
  const [autoLock, setAutoLock] = React.useState(300);
  const [lockOnHide, setLockOnHide] = React.useState(false);
  const [lockBusy, setLockBusy] = React.useState(false);

  const [encryption, setEncryption] =
    React.useState<EncryptionSettingsView | null>(null);
  const [encryptionOpen, setEncryptionOpen] = React.useState(false);
  const [currentDiaryPassword, setCurrentDiaryPassword] = React.useState('');
  const [newDiaryPassword, setNewDiaryPassword] = React.useState('');
  const [confirmDiaryPassword, setConfirmDiaryPassword] = React.useState('');
  const [diaryBusy, setDiaryBusy] = React.useState(false);

  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordBusy, setPasswordBusy] = React.useState(false);

  const [biometricBusy, setBiometricBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const applyLockView = React.useCallback((view: LockSettingsView | null) => {
    if (!view) return;
    setLockEnabled(view.isLockEnabled);
    setAutoLock(view.autoLockTimeout);
    setLockOnHide(view.lockOnTabHide);
    setPin('');
  }, []);

  React.useEffect(() => {
    // Hydrate the editable form from the fetched lock settings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyLockView(lockPrefs);
  }, [lockPrefs, applyLockView]);

  React.useEffect(() => {
    if (!lockPrefs) void reloadBootstrap();
  }, [lockPrefs, reloadBootstrap]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await createDiaryClient().getEncryptionSettings();
        if (!cancelled) setEncryption(settings);
      } catch {
        // The bootstrap copy below is enough to render the status.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveLockSettings() {
    setError(null);
    setNotice(null);
    if (pin.length > 0 && !PIN_PATTERN.test(pin)) {
      setError('The PIN must be 4 to 6 digits.');
      return;
    }
    if (lockEnabled && !lockPrefs?.hasPasscode && pin.length === 0) {
      setError('Choose a PIN to turn on the diary lock.');
      return;
    }
    if (!masterKey) return;

    setLockBusy(true);
    try {
      const proof = await deriveUnlockProofHex(masterKey);
      await createDiaryClient().saveLockSettings({
        isLockEnabled: lockEnabled,
        passcode: pin.length > 0 ? pin : undefined,
        autoLockTimeout: autoLock,
        lockOnTabHide: lockOnHide,
        unlockProof: proof,
      });
      setPin('');
      await reloadBootstrap();
      setNotice('Lock settings saved.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLockBusy(false);
    }
  }

  async function changeDiaryPassword() {
    setError(null);
    setNotice(null);
    if (newDiaryPassword.length < 8) {
      setError('The new diary password needs at least 8 characters.');
      return;
    }
    if (newDiaryPassword !== confirmDiaryPassword) {
      setError('The new diary passwords do not match.');
      return;
    }
    if (!encryption || !bootstrap) return;

    setDiaryBusy(true);
    try {
      const oldKey = await deriveKeyFromPassword(
        currentDiaryPassword,
        encryption.encryptionSalt,
        encryption.kdfIterations,
      );
      let masterKeyHex: string;
      try {
        masterKeyHex = await decryptText(
          encryption.verificationCiphertext,
          oldKey,
        );
      } catch {
        throw new Error('Incorrect current Diary Password.');
      }

      const newKey = await deriveKeyFromPassword(
        newDiaryPassword,
        encryption.encryptionSalt,
        KDF_ITERATIONS,
      );
      const newVerification = await encryptText(masterKeyHex, newKey);
      const proof = await deriveUnlockProofHex(
        await importKeyFromHex(masterKeyHex),
      );

      await createDiaryClient().mutateEncryption({
        action: 'change-password',
        verificationCiphertext: newVerification,
        unlockProof: proof,
        kdfIterations: KDF_ITERATIONS,
      });

      setEncryption({
        ...encryption,
        verificationCiphertext: newVerification,
        kdfIterations: KDF_ITERATIONS,
      });
      await reloadBootstrap();
      setEncryptionOpen(false);
      setCurrentDiaryPassword('');
      setNewDiaryPassword('');
      setConfirmDiaryPassword('');
      setNotice(
        'Diary password updated. Other devices must unlock with the new password.',
      );
    } catch (err) {
      setError(describeError(err));
    } finally {
      setDiaryBusy(false);
    }
  }

  async function changeSignInPassword() {
    setError(null);
    setNotice(null);
    if (newPassword.length < 8) {
      setError('The new password needs at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Could not change password.');
      }
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Sign-in password updated.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function toggleBiometrics() {
    setError(null);
    setNotice(null);
    setBiometricBusy(true);
    try {
      if (biometricEnrolled) {
        await disableBiometrics();
        setNotice('Biometric unlock removed from this device.');
      } else {
        await enrollBiometrics();
        setNotice(
          `Biometric unlock enabled. You can now open the diary with ${biometrics?.label ?? 'biometrics'}.`,
        );
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBiometricBusy(false);
    }
  }

  const isEncrypted =
    encryption?.isClientEncrypted ?? bootstrap?.encryption.isClientEncrypted;
  const kdfIterations =
    encryption?.kdfIterations ?? bootstrap?.encryption.kdfIterations;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to settings"
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons color={theme.foreground} name="chevron-back" size={24} />
          </Pressable>
          <View style={styles.flex}>
            <ThemedText type="label" themeColor="textSecondary">
              Settings · Privacy &amp; security
            </ThemedText>
            <ThemedText type="subtitle">Keys &amp; locks</ThemedText>
          </View>
        </View>

        {notice ? (
          <ThemedText type="small" themeColor="accent">
            {notice}
          </ThemedText>
        ) : null}
        {error ? (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        ) : null}

        <SectionLabel>Diary encryption</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="smallBold">
            {isEncrypted
              ? 'Zero-knowledge encryption is on'
              : 'Server-side encryption'}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {isEncrypted
              ? `PBKDF2-SHA256 · ${(kdfIterations ?? KDF_ITERATIONS).toLocaleString('en-US')} iterations. The server only ever stores ciphertext.`
              : 'This account still uses the server-side diary format.'}
          </ThemedText>
          {isEncrypted ? (
            <Button
              label="Change diary password"
              onPress={() => setEncryptionOpen(true)}
              variant="secondary"
            />
          ) : (
            <ThemedText type="caption" themeColor="textSecondary">
              Enable encryption from the web app once; this client opens
              encrypted diaries only. Disabling zero-knowledge is not offered
              on any client.
            </ThemedText>
          )}
        </Card>

        <SectionLabel>Diary lock</SectionLabel>
        <Card style={styles.gap}>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Turn on the diary lock</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Asks for a PIN when the diary reopens after the timeout.
              </ThemedText>
            </View>
            <Switch
              onValueChange={setLockEnabled}
              thumbColor={lockEnabled ? theme.accent : undefined}
              value={lockEnabled}
            />
          </View>

          <Field
            hint={
              lockPrefs?.hasPasscode
                ? 'Leave blank to keep the current PIN.'
                : '4–6 digits. Needed to turn the lock on.'
            }
            keyboardType="number-pad"
            label="PIN"
            maxLength={6}
            onChangeText={setPin}
            placeholder={lockPrefs?.hasPasscode ? '••••' : 'Choose a PIN'}
            secureTextEntry
            value={pin}
          />

          <ThemedText type="smallBold">Lock after inactivity</ThemedText>
          <View style={styles.chipWrap}>
            {AUTO_LOCK.map((option) => (
              <Chip
                key={option.value}
                active={autoLock === option.value}
                label={option.label}
                onPress={() => setAutoLock(option.value)}
              />
            ))}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Lock when leaving the app</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Clears the key from memory as soon as the app is backgrounded.
              </ThemedText>
            </View>
            <Switch
              onValueChange={setLockOnHide}
              thumbColor={lockOnHide ? theme.accent : undefined}
              value={lockOnHide}
            />
          </View>

          <Button
            label="Save lock settings"
            loading={lockBusy}
            onPress={() => void saveLockSettings()}
          />
          {masterKey ? (
            <Button
              label="Lock now"
              onPress={lock}
              variant="secondary"
            />
          ) : null}
        </Card>

        <SectionLabel>Biometric unlock</SectionLabel>
        <Card style={styles.gap}>
          <ListRow
            detail={
              biometrics?.available
                ? biometricEnrolled
                  ? `The diary key is stored behind ${biometrics.label} in the device keystore.`
                  : `Use ${biometrics.label} instead of typing the diary password.`
                : 'This device has no enrolled biometric sensor.'
            }
            label={biometrics?.label ?? 'Biometrics'}
            last
            value={biometricEnrolled ? 'On' : 'Off'}
          />
          <Button
            disabled={!biometrics?.available || !masterKey}
            label={
              biometricEnrolled
                ? `Disable ${biometrics?.label ?? 'biometric'} unlock`
                : `Enable ${biometrics?.label ?? 'biometric'} unlock`
            }
            loading={biometricBusy}
            onPress={() => void toggleBiometrics()}
            variant="secondary"
          />
        </Card>

        <SectionLabel>Sign-in password</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="caption" themeColor="textSecondary">
            Your account password is separate from the diary password. It never
            decrypts the journal.
          </ThemedText>
          <Button
            label="Change sign-in password"
            onPress={() => setPasswordOpen(true)}
            variant="secondary"
          />
        </Card>
      </ScrollView>

      <Sheet
        onClose={() => setEncryptionOpen(false)}
        title="Change Diary Password"
        visible={encryptionOpen}
      >
        <ThemedText type="caption" themeColor="textSecondary">
          The wrapped master key is re-encrypted with the new password. Entry
          contents are unchanged.
        </ThemedText>
        <Field
          label="Current Diary Password"
          onChangeText={setCurrentDiaryPassword}
          secureTextEntry
          value={currentDiaryPassword}
        />
        <Field
          label="New Diary Password"
          onChangeText={setNewDiaryPassword}
          secureTextEntry
          value={newDiaryPassword}
        />
        <Field
          label="Confirm New Password"
          onChangeText={setConfirmDiaryPassword}
          secureTextEntry
          value={confirmDiaryPassword}
        />
        <Button
          disabled={
            !currentDiaryPassword ||
            !newDiaryPassword ||
            !confirmDiaryPassword
          }
          label="Update diary password"
          loading={diaryBusy}
          onPress={() => void changeDiaryPassword()}
        />
      </Sheet>

      <Sheet
        onClose={() => setPasswordOpen(false)}
        title="Change sign-in password"
        visible={passwordOpen}
      >
        <Field
          autoComplete="current-password"
          label="Current password"
          onChangeText={setCurrentPassword}
          secureTextEntry
          value={currentPassword}
        />
        <Field
          autoComplete="new-password"
          label="New password"
          onChangeText={setNewPassword}
          secureTextEntry
          value={newPassword}
        />
        <Field
          autoComplete="new-password"
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          value={confirmPassword}
        />
        <Button
          disabled={!currentPassword || !newPassword || !confirmPassword}
          label="Update sign-in password"
          loading={passwordBusy}
          onPress={() => void changeSignInPassword()}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  gap: { gap: Spacing.three },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
