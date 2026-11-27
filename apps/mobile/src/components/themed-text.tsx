import { Platform, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'small'
  | 'smallBold'
  | 'label'
  | 'caption'
  | 'link'
  | 'linkPrimary'
  | 'code'
  | 'serif'
  | 'hand';

export type ThemeTextColor =
  | 'text'
  | 'textSecondary'
  | 'accent'
  | 'accentForeground'
  | 'destructive'
  | 'primary'
  | 'card'
  | 'border';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeTextColor;
};

/**
 * Type ramp shared by every mobile surface. Sizes scale with the paper-scale
 * preference (web `--withink-paper-scale`) and faces follow the selected
 * typography pairing.
 */
export function ThemedText({
  style,
  type = 'default',
  themeColor = 'text',
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const scale = theme.scale;
  const color =
    themeColor === 'text'
      ? theme.text
      : themeColor === 'textSecondary'
        ? theme.textSecondary
        : theme[themeColor];

  return (
    <Text
      style={[
        { color, fontFamily: theme.fonts.sans },
        typeStyles(theme.fonts, scale)[type],
        style,
      ]}
      {...rest}
    />
  );
}

function typeStyles(
  fonts: { sans: string; serif: string; mono: string; hand: string },
  scale: number,
) {
  const s = (value: number) => Math.round(value * scale);
  return {
    default: { fontSize: s(16), lineHeight: s(24), fontWeight: '500' as const },
    title: {
      fontSize: s(44),
      lineHeight: s(50),
      fontWeight: '600' as const,
      fontFamily: fonts.serif,
      letterSpacing: -0.8,
    },
    subtitle: {
      fontSize: s(30),
      lineHeight: s(40),
      fontWeight: '600' as const,
      fontFamily: fonts.serif,
      letterSpacing: -0.4,
    },
    heading: {
      fontSize: s(22),
      lineHeight: s(30),
      fontWeight: '600' as const,
      fontFamily: fonts.serif,
    },
    small: { fontSize: s(14), lineHeight: s(20), fontWeight: '500' as const },
    smallBold: {
      fontSize: s(14),
      lineHeight: s(20),
      fontWeight: '700' as const,
    },
    label: {
      fontSize: s(11),
      lineHeight: s(16),
      fontWeight: '600' as const,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
    caption: { fontSize: s(12), lineHeight: s(18), fontWeight: '400' as const },
    link: { fontSize: s(14), lineHeight: s(30), fontWeight: '500' as const },
    linkPrimary: {
      fontSize: s(14),
      lineHeight: s(30),
      fontWeight: '600' as const,
    },
    code: {
      fontFamily: fonts.mono,
      fontWeight:
        Platform.select({ android: '700' as const }) ?? ('500' as const),
      fontSize: s(12),
    },
    serif: {
      fontFamily: fonts.serif,
      fontSize: s(16),
      lineHeight: s(26),
      fontWeight: '400' as const,
    },
    hand: {
      fontFamily: fonts.hand,
      fontSize: s(18),
      lineHeight: s(24),
      fontWeight: '400' as const,
    },
  };
}
