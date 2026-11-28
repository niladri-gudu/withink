import { Ionicons } from '@expo/vector-icons';
import type { BillingSummaryView } from '@withink/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Card,
  ConfirmSheet,
  Field,
  ListRow,
  SectionLabel,
  Sheet,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDiaryClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { openLegalPage, PRIVACY_URL, TERMS_URL } from '@/lib/legal';
import { describeError, useDiary } from '@/providers/diary-provider';

export function SettingsHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    session,
    profile,
    plan,
    pending,
    syncState,
    lastSyncedAt,
    reloadBootstrap,
    signOut,
  } = useDiary();

  const [billing, setBilling] = React.useState<BillingSummaryView | null>(null);
  const [nameOpen, setNameOpen] = React.useState(false);
  const [name, setName] = React.useState(session?.user.name ?? '');
  const [nameBusy, setNameBusy] = React.useState(false);
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const [signOutBusy, setSignOutBusy] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const summary = await createDiaryClient().getBillingSummary();
        if (!cancelled) setBilling(summary);
      } catch {
        // The hub still works with the cached plan hint.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('A name is required.');
      return;
    }
    setNameBusy(true);
    setError(null);
    try {
      const result = await authClient.updateUser({ name: trimmed });
      if (result.error) {
        throw new Error(result.error.message ?? 'Could not save the name.');
      }
      await reloadBootstrap();
      setNameOpen(false);
      setNotice('Profile name updated.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setNameBusy(false);
    }
  }

  async function confirmSignOut() {
    setSignOutBusy(true);
    try {
      await signOut();
      setSignOutOpen(false);
      router.replace('/sign-in');
    } finally {
      setSignOutBusy(false);
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    setError(null);
    try {
      await createDiaryClient().deleteAccount(
        deletePassword.trim() || undefined,
      );
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const syncDetail =
    pending > 0
      ? `${pending} waiting`
      : syncState === 'offline'
        ? 'Offline'
        : lastSyncedAt
          ? 'Synced'
          : 'Not synced yet';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <ThemedText type="label" themeColor="textSecondary">
            08 · Settings
          </ThemedText>
          <ThemedText type="subtitle">The colophon</ThemedText>
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

        <Card style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
            <ThemedText type="heading" themeColor="accent">
              {(session?.user.name ?? 'W').slice(0, 1).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="heading">
              {session?.user.name || 'Writer'}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {session?.user.email}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Edit profile name"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              setName(session?.user.name ?? '');
              setError(null);
              setNameOpen(true);
            }}
          >
            <Ionicons
              color={theme.mutedForeground}
              name="pencil"
              size={18}
            />
          </Pressable>
        </Card>

        <SectionLabel>Account</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            icon="sparkles-outline"
            label="Plan"
            value={plan[0]!.toUpperCase() + plan.slice(1)}
          />
          <ListRow
            detail={
              billing?.currentPeriodEnd
                ? `Renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                : 'Subscriptions are managed on the web.'
            }
            label="Subscription"
            last
            value={billing?.status ?? 'Web-managed'}
          />
        </Card>

        <SectionLabel>Appearance</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            detail="Palette, typography, accent and paper scale"
            icon="color-palette-outline"
            label="Paper & ink"
            last
            onPress={() => router.push('/settings/appearance')}
          />
        </Card>

        <SectionLabel>Journal</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            detail="Local cache, rebuild, export"
            icon="cloud-upload-outline"
            label="Sync & data"
            onPress={() => router.push('/settings/data')}
            value={syncDetail}
          />
          <ListRow
            detail="Daily reminder and letter alerts"
            icon="notifications-outline"
            label="Reminders"
            last
            onPress={() => router.push('/settings/reminders')}
          />
        </Card>

        <SectionLabel>Support</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            detail="Report a bug or send an idea"
            icon="chatbubble-ellipses-outline"
            label="Feedback"
            last
            onPress={() => router.push('/feedback')}
          />
        </Card>

        <SectionLabel>Privacy & security</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            detail="Diary lock, encryption, biometrics, sign-in password"
            icon="finger-print-outline"
            label="Keys & locks"
            last
            onPress={() => router.push('/settings/security')}
          />
        </Card>

        <SectionLabel>Legal</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            label="Privacy policy"
            onPress={() => openLegalPage(PRIVACY_URL)}
          />
          <ListRow
            label="Terms of service"
            last
            onPress={() => openLegalPage(TERMS_URL)}
          />
        </Card>

        <SectionLabel>Account</SectionLabel>
        <Card style={styles.list}>
          <ListRow
            detail={`Member since ${profile?.createdAt?.slice(0, 10) ?? '—'}`}
            label="Connected as"
            value={session?.user.email ?? ''}
          />
          <ListRow
            label="Sign out"
            last
            onPress={() => setSignOutOpen(true)}
          />
        </Card>

        <SectionLabel>Danger zone</SectionLabel>
        <Card style={styles.gap}>
          <ThemedText type="smallBold" themeColor="destructive">
            Delete account
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Cancels any subscription and permanently removes your journal,
            letters, media, settings and account. This cannot be undone.
          </ThemedText>
          <Button
            label="Delete my account"
            onPress={() => {
              setDeletePassword('');
              setError(null);
              setDeleteOpen(true);
            }}
            variant="destructive"
          />
        </Card>

        <View style={{ height: Spacing.five }} />
      </ScrollView>

      <Sheet
        onClose={() => setNameOpen(false)}
        title="Profile name"
        visible={nameOpen}
      >
        <Field
          autoFocus
          error={error}
          label="Display name"
          onChangeText={setName}
          onSubmitEditing={() => void saveName()}
          value={name}
        />
        <Field
          editable={false}
          hint="Email is managed by your sign-in provider."
          label="Email"
          value={session?.user.email ?? ''}
        />
        <Button
          disabled={nameBusy || name.trim().length === 0}
          label="Save changes"
          loading={nameBusy}
          onPress={() => void saveName()}
        />
      </Sheet>

      <ConfirmSheet
        busy={signOutBusy}
        confirmLabel="Sign out"
        destructive
        message="Your encrypted cache is removed from this device. Synced pages stay in your account."
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => void confirmSignOut()}
        title="Sign out?"
        visible={signOutOpen}
      />

      <Sheet
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        visible={deleteOpen}
      >
        <ThemedText type="small" themeColor="destructive">
          Every page, letter, image and setting is destroyed. There is no
          recovery and no grace period.
        </ThemedText>
        <Field
          autoComplete="current-password"
          hint="Required for email/password accounts."
          label="Confirm with your sign-in password"
          onChangeText={setDeletePassword}
          secureTextEntry
          value={deletePassword}
        />
        <Button
          label="Permanently delete everything"
          loading={deleteBusy}
          onPress={() => void confirmDelete()}
          variant="destructive"
        />
        <Button
          label="Cancel"
          onPress={() => setDeleteOpen(false)}
          variant="secondary"
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  heading: { paddingTop: Spacing.four, gap: Spacing.one },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingVertical: 0, gap: 0 },
  gap: { gap: Spacing.two },
});
