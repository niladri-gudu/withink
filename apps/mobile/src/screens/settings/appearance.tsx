import { Ionicons } from '@expo/vector-icons';
import {
  ACCENTS,
  FONTS,
  PALETTES,
  isAccentUnlocked,
  isFontUnlocked,
  isPaletteUnlocked,
} from '@withink/tokens/native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance } from '@/providers/appearance-provider';
import { useDiary } from '@/providers/diary-provider';

const SCALES = [0.9, 1, 1.1, 1.2] as const;

export function AppearanceSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { plan } = useDiary();
  const { prefs, setPalette, setFont, setAccent, setScale, reset } =
    useAppearance();
  const [notice, setNotice] = React.useState<string | null>(null);

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
              Settings · Appearance
            </ThemedText>
            <ThemedText type="subtitle">Paper &amp; ink</ThemedText>
          </View>
        </View>

        <Card style={styles.preview}>
          <ThemedText type="label" themeColor="accent">
            Preview
          </ThemedText>
          <ThemedText type="heading">Today&apos;s page</ThemedText>
          <ThemedText type="serif" themeColor="textSecondary">
            The morning light settled on the desk, and the page was waiting.
          </ThemedText>
        </Card>

        {notice ? (
          <ThemedText type="small" themeColor="accent">
            {notice}
          </ThemedText>
        ) : null}

        <SectionLabel>Paper world</SectionLabel>
        <View style={styles.paletteGrid}>
          {PALETTES.map((palette) => {
            const active = prefs.palette === palette.id;
            const unlocked = isPaletteUnlocked(palette.id, plan);
            return (
              <Pressable
                key={palette.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!unlocked) {
                    setNotice(
                      `“${palette.name}” unlocks on Plus. Existing choices are kept on any plan.`,
                    );
                    return;
                  }
                  setNotice(null);
                  setPalette(palette.id);
                }}
                style={({ pressed }) => [
                  styles.paletteCard,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: theme.card,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.swatches}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.swatchLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.swatchDark },
                    ]}
                  />
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: palette.accentLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: palette.accentDark },
                    ]}
                  />
                </View>
                <View style={styles.paletteText}>
                  <ThemedText type="smallBold">
                    {palette.name}
                    {!unlocked ? '  ·  Plus' : ''}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {palette.desc}
                  </ThemedText>
                </View>
                {active ? (
                  <Ionicons color={theme.accent} name="checkmark" size={18} />
                ) : !unlocked ? (
                  <Ionicons
                    color={theme.mutedForeground}
                    name="lock-closed-outline"
                    size={16}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Typography</SectionLabel>
        <Card style={styles.gap}>
          {FONTS.map((font) => {
            const active = prefs.font === font.id;
            const unlocked = isFontUnlocked(font.id, plan);
            return (
              <Pressable
                key={font.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!unlocked) {
                    setNotice(
                      `“${font.name}” unlocks on Pro. Existing choices are kept on any plan.`,
                    );
                    return;
                  }
                  setNotice(null);
                  setFont(font.id);
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.flex}>
                  <ThemedText
                    style={{
                      fontFamily:
                        font.id === 'alegreya'
                          ? 'Alegreya_400Regular'
                          : font.id === 'literata'
                            ? 'Literata_400Regular'
                            : font.id === 'editorial'
                              ? 'Geist_400Regular'
                              : font.id === 'codex'
                                ? 'JetBrainsMono_400Regular'
                                : 'CormorantGaramond_400Regular',
                      fontSize: 17,
                    }}
                  >
                    {font.name}
                    {!unlocked ? '  ·  Pro' : ''}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {font.desc}
                  </ThemedText>
                </View>
                {active ? (
                  <Ionicons color={theme.accent} name="checkmark" size={18} />
                ) : !unlocked ? (
                  <Ionicons
                    color={theme.mutedForeground}
                    name="lock-closed-outline"
                    size={16}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <SectionLabel>Accent</SectionLabel>
        <View style={styles.accentRow}>
          {ACCENTS.map((accent) => {
            const active = prefs.accent === accent.id;
            const unlocked = isAccentUnlocked(accent.id, plan);
            return (
              <Pressable
                key={accent.id}
                accessibilityLabel={`${accent.name}${unlocked ? '' : ' (Pro)'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!unlocked) {
                    setNotice(`“${accent.name}” unlocks on Pro.`);
                    return;
                  }
                  setNotice(null);
                  setAccent(accent.id);
                }}
                style={({ pressed }) => [
                  styles.accent,
                  {
                    borderColor: active ? theme.foreground : theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.accentDot,
                    {
                      backgroundColor:
                        theme.mode === 'dark'
                          ? accent.swatchDark
                          : accent.swatchLight,
                    },
                  ]}
                />
                {!unlocked ? (
                  <Ionicons
                    color={theme.mutedForeground}
                    name="lock-closed-outline"
                    size={11}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Paper scale</SectionLabel>
        <View style={styles.scaleRow}>
          {SCALES.map((scale) => (
            <Chip
              key={scale}
              active={prefs.scale === scale}
              label={`${Math.round(scale * 100)}%`}
              onPress={() => setScale(scale)}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            reset();
            setNotice('Appearance reset to the standard desk.');
          }}
          style={styles.reset}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Reset to the standard desk
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" themeColor="textSecondary">
          Curated palettes are a Plus feature; font pairings and accent variants
          are Pro. A selection made on a higher plan keeps working after a
          downgrade.
        </ThemedText>
      </ScrollView>
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
  preview: { gap: Spacing.two },
  gap: { gap: Spacing.two },
  paletteGrid: { gap: Spacing.two },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    padding: Spacing.three,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  swatch: { width: 18, height: 26, borderRadius: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 1 },
  paletteText: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentRow: { flexDirection: 'row', gap: Spacing.three },
  accent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  accentDot: { width: 22, height: 22, borderRadius: 11 },
  scaleRow: { flexDirection: 'row', gap: Spacing.two },
  reset: { paddingVertical: Spacing.two },
});
