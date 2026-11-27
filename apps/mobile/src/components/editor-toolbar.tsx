import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { EditorCommand, FormatState } from '@withink/editor';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

interface ToolbarButton {
  command: EditorCommand;
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  active?: keyof FormatState;
  bold?: boolean;
}

/** The web phone toolbar: undo/redo, inline marks, lists, then the sheet. */
const BUTTONS: ToolbarButton[] = [
  {
    command: { name: 'undo' },
    icon: 'arrow-undo-outline',
    accessibilityLabel: 'Undo',
    active: 'canUndo',
  },
  {
    command: { name: 'redo' },
    icon: 'arrow-redo-outline',
    accessibilityLabel: 'Redo',
    active: 'canRedo',
  },
  {
    command: { name: 'bold' },
    label: 'B',
    accessibilityLabel: 'Bold',
    active: 'isBold',
    bold: true,
  },
  {
    command: { name: 'italic' },
    label: 'I',
    accessibilityLabel: 'Italic',
    active: 'isItalic',
  },
  {
    command: { name: 'underline' },
    label: 'U',
    accessibilityLabel: 'Underline',
    active: 'isUnderline',
  },
  {
    command: { name: 'bulletList' },
    icon: 'list-outline',
    accessibilityLabel: 'Bullet list',
    active: 'isBulletList',
  },
  {
    command: { name: 'taskList' },
    icon: 'checkbox-outline',
    accessibilityLabel: 'Checklist',
    active: 'isTaskList',
  },
];

interface EditorToolbarProps {
  state: FormatState | null;
  wordCount: number;
  onCommand(command: EditorCommand): void;
  onOpenMore(): void;
}

/**
 * Compact formatting row for the native editor. Commands travel over the
 * WebView bridge; active state comes back from the same derivation the web
 * toolbar uses. The full strip lives in the formatting sheet.
 */
export function EditorToolbar({
  state,
  wordCount,
  onCommand,
  onOpenMore,
}: EditorToolbarProps) {
  const theme = useTheme();
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <View
      style={[
        styles.wrapper,
        { borderColor: theme.border, backgroundColor: theme.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        style={styles.flex}
      >
        {BUTTONS.map((button) => {
          const active = button.active
            ? Boolean(state?.[button.active])
            : false;
          return (
            <Pressable
              accessibilityLabel={button.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              hitSlop={4}
              key={button.accessibilityLabel}
              onPress={() => onCommand(button.command)}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: active ? theme.muted : 'transparent',
                  opacity: pressed ? 0.5 : 1,
                },
              ]}
            >
              {button.icon ? (
                <Ionicons
                  color={active ? theme.accent : theme.mutedForeground}
                  name={button.icon}
                  size={19}
                />
              ) : (
                <ThemedText
                  style={[
                    styles.label,
                    button.bold ? styles.bold : null,
                    { color: active ? theme.accent : theme.foreground },
                  ]}
                >
                  {button.label}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="More formatting"
          accessibilityRole="button"
          hitSlop={4}
          onPress={onOpenMore}
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons color={theme.mutedForeground} name="add" size={22} />
        </Pressable>
      </ScrollView>

      <View style={styles.counter}>
        <ThemedText type="caption" themeColor="textSecondary">
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {readingTime}m
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
  content: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 38,
    minHeight: 38,
    paddingHorizontal: Spacing.one,
  },
  label: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '700' },
  counter: { paddingRight: Spacing.three },
});
