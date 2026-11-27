import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/hooks/use-app-fonts';
import { CryptoWebViewHost } from '@/lib/crypto-webview';
import { AppearanceProvider, useAppearance } from '@/providers/appearance-provider';
import { DiaryProvider } from '@/providers/diary-provider';

function AppNavigation() {
  const { theme, mode } = useAppearance();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.card,
      text: theme.foreground,
      border: theme.border,
      notification: theme.destructive,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <CryptoWebViewHost />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useAppFonts();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppearanceProvider>
          <DiaryProvider>
            <AppNavigation />
          </DiaryProvider>
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
