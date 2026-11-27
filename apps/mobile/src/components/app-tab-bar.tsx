import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary } from '@/providers/diary-provider';

import { ThemedText } from './themed-text';
import { ConfirmSheet, Sheet } from './ui';

const PRIMARY = [
  { label: 'Today', href: '/', icon: 'sunny-outline', match: /^\/$/ },
  {
    label: 'Entries',
    href: '/entries',
    icon: 'time-outline',
    match: /^\/entries/,
  },
  {
    label: 'Insights',
    href: '/insights',
    icon: 'stats-chart-outline',
    match: /^\/insights/,
  },
] as const;

const SECONDARY = [
  { label: 'Notebooks', href: '/notebooks', icon: 'library-outline' },
  { label: 'Flashbacks', href: '/flashbacks', icon: 'sparkles-outline' },
  { label: 'Media', href: '/media', icon: 'images-outline' },
  { label: 'Settings', href: '/settings', icon: 'settings-outline' },
] as const;

export const TAB_BAR_HEIGHT = 58;

/** Bottom index mirroring the web's Today · Entries · Insights · More bar. */
export function AppTabBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useDiary();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const moreActive = SECONDARY.some((item) => pathname.startsWith(item.href));

  function navigate(href: (typeof PRIMARY)[number]['href'] | (typeof SECONDARY)[number]['href']) {
    setMoreOpen(false);
    router.navigate(href);
  }

  async function confirmSignOut() {
    setBusy(true);
    try {
      await signOut();
      setSignOutOpen(false);
      router.replace('/sign-in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View style={styles.items}>
          {PRIMARY.map((item) => {
            const active = item.match.test(pathname);
            return (
              <Pressable
                key={item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => router.navigate(item.href)}
                style={styles.item}
              >
                {active ? (
                  <View style={[styles.tick, { backgroundColor: theme.accent }]} />
                ) : null}
                <Ionicons
                  color={active ? theme.accent : theme.mutedForeground}
                  name={item.icon}
                  size={21}
                />
                <ThemedText
                  type="caption"
                  themeColor={active ? 'text' : 'textSecondary'}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: moreActive || moreOpen }}
            onPress={() => setMoreOpen(true)}
            style={styles.item}
          >
            {moreActive ? (
              <View style={[styles.tick, { backgroundColor: theme.accent }]} />
            ) : null}
            <Ionicons
              color={
                moreActive ? theme.accent : theme.mutedForeground
              }
              name="ellipsis-horizontal"
              size={21}
            />
            <ThemedText
              type="caption"
              themeColor={moreActive ? 'text' : 'textSecondary'}
            >
              More
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Sheet visible={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <View style={styles.moreList}>
          {SECONDARY.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => navigate(item.href)}
                style={({ pressed }) => [
                  styles.moreRow,
                  {
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  color={active ? theme.accent : theme.mutedForeground}
                  name={item.icon}
                  size={20}
                />
                <ThemedText style={styles.moreLabel}>{item.label}</ThemedText>
                <Ionicons
                  color={theme.mutedForeground}
                  name="chevron-forward"
                  size={16}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.account, { borderTopColor: theme.border }]}>
          <View style={styles.accountText}>
            <ThemedText type="smallBold">
              {session?.user.name || 'Writer'}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {session?.user.email}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMoreOpen(false);
              setSignOutOpen(true);
            }}
          >
            <ThemedText type="smallBold" themeColor="destructive">
              Sign out
            </ThemedText>
          </Pressable>
        </View>
      </Sheet>

      <ConfirmSheet
        busy={busy}
        confirmLabel="Sign out"
        destructive
        message="Your encrypted cache is removed from this device. Synced pages stay in your account."
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => void confirmSignOut()}
        title="Sign out?"
        visible={signOutOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  items: { flex: 1, flexDirection: 'row' },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  moreList: { gap: 0 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moreLabel: { flex: 1 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountText: { flex: 1 },
});
