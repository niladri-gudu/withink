import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTabBar, TAB_BAR_HEIGHT } from '@/components/app-tab-bar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary } from '@/providers/diary-provider';
import { LegacyMigrationScreen } from '@/screens/legacy-migration';
import { UnlockGate } from '@/screens/unlock';

/** Editors are fullscreen surfaces, like the web's dated entry route. */
const FULLSCREEN = /^(?:\/entries\/[^/]+|\/letters\/[^/]+)$/;

export default function AppLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const {
    session,
    isPending,
    bootstrap,
    bootstrapError,
    reloadBootstrap,
    masterKey,
    legacyAccount,
    signOut,
  } = useDiary();

  if (isPending) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.foreground} />
        </View>
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!bootstrap) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.foreground} />
          <ThemedText type="small" themeColor="textSecondary">
            {bootstrapError ?? 'Opening your shelf…'}
          </ThemedText>
          {bootstrapError ? (
            <>
              <Button
                label="Try again"
                onPress={() => void reloadBootstrap()}
                variant="secondary"
              />
              <Button
                label="Sign out"
                onPress={() => {
                  void signOut();
                }}
                variant="ghost"
              />
            </>
          ) : null}
        </View>
      </Screen>
    );
  }

  if (legacyAccount) {
    return <LegacyMigrationScreen />;
  }

  if (!masterKey) {
    return <UnlockGate />;
  }

  const showBar = !FULLSCREEN.test(pathname);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        style={{
          flex: 1,
          paddingBottom: showBar ? TAB_BAR_HEIGHT + insets.bottom : 0,
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        />
      </View>
      {showBar ? <AppTabBar /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
});
