import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText
      type="label"
      themeColor="textSecondary"
      style={styles.sectionLabel}
    >
      {children}
    </ThemedText>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderText}>
        {eyebrow ? (
          <ThemedText type="label" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="subtitle">{title}</ThemedText>
        {subtitle ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.subtitle}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: ViewProps['style'];
}) {
  const theme = useTheme();
  const palette = {
    primary: {
      bg: theme.accent,
      fg: theme.accentForeground,
      border: theme.accent,
    },
    secondary: { bg: theme.muted, fg: theme.foreground, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.foreground, border: 'transparent' },
    destructive: {
      bg: theme.destructive,
      fg: theme.destructiveForeground,
      border: theme.destructive,
    },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Ionicons color={palette.fg} name={icon} size={18} /> : null}
          <ThemedText type="smallBold" style={{ color: palette.fg }}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export const Field = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps & { label?: string; hint?: string; error?: string | null }
>(function Field({ label, hint, error, style, ...rest }, ref) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.mutedForeground}
        style={[
          styles.input,
          {
            color: theme.foreground,
            backgroundColor: theme.card,
            borderColor: error ? theme.destructive : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText type="small" themeColor="destructive">
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
});

export function ListRow({
  label,
  detail,
  value,
  onPress,
  destructive = false,
  icon,
  last = false,
}: {
  label: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  last?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          color={destructive ? theme.destructive : theme.accent}
          name={icon}
          size={18}
        />
      ) : null}
      <View style={styles.rowText}>
        <ThemedText themeColor={destructive ? 'destructive' : 'text'}>
          {label}
        </ThemedText>
        {detail ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      ) : null}
      {onPress ? (
        <Ionicons
          color={theme.mutedForeground}
          name="chevron-forward"
          size={16}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.muted,
          borderColor: active ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: active ? theme.accentForeground : theme.foreground }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <ThemedText type="heading" style={styles.centerText}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {body}
        </ThemedText>
      ) : null}
      {action}
    </View>
  );
}

export function Skeleton({
  height = 16,
  width = '100%',
}: {
  height?: number;
  width?: number | `${number}%`;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        width,
        borderRadius: Radii.sm,
        backgroundColor: theme.muted,
      }}
    />
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <ThemedText type="heading" style={styles.sheetTitle}>
              {title}
            </ThemedText>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              hitSlop={12}
            >
              <Ionicons color={theme.mutedForeground} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onCancel}>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
      <View style={styles.confirmActions}>
        <Button
          label="Cancel"
          onPress={onCancel}
          variant="secondary"
          style={styles.flex}
        />
        <Button
          label={confirmLabel}
          loading={busy}
          onPress={onConfirm}
          variant={destructive ? 'destructive' : 'primary'}
          style={styles.flex}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.xl,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionLabel: { marginTop: Spacing.three },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  screenHeaderText: { flex: 1, gap: Spacing.one },
  subtitle: { marginTop: 2 },
  button: {
    minHeight: 48,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  field: { gap: Spacing.one },
  input: {
    minHeight: 48,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.two,
  },
  rowText: { flex: 1, gap: 2 },
  chip: {
    minHeight: 36,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sheetTitle: { flex: 1 },
  sheetContent: { gap: Spacing.three, paddingBottom: Spacing.three },
  sheetFooter: { paddingTop: Spacing.two },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
