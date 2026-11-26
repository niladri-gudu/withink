import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { EditorCommand, FormatState } from "@withink/editor";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ThemedText } from "./themed-text";

interface ToolbarButton {
  command: EditorCommand;
  label: string;
  accessibilityLabel: string;
  active?: keyof FormatState;
  bold?: boolean;
}

const BUTTONS: ToolbarButton[] = [
  {
    command: { name: "bold" },
    label: "B",
    accessibilityLabel: "Bold",
    active: "isBold",
    bold: true,
  },
  {
    command: { name: "italic" },
    label: "I",
    accessibilityLabel: "Italic",
    active: "isItalic",
  },
  {
    command: { name: "underline" },
    label: "U",
    accessibilityLabel: "Underline",
    active: "isUnderline",
  },
  {
    command: { name: "strike" },
    label: "S",
    accessibilityLabel: "Strikethrough",
    active: "isStrike",
  },
  {
    command: { name: "highlight" },
    label: "H",
    accessibilityLabel: "Highlight",
    active: "isHighlight",
  },
  {
    command: { name: "heading1" },
    label: "H1",
    accessibilityLabel: "Heading 1",
    active: "isH1",
    bold: true,
  },
  {
    command: { name: "heading2" },
    label: "H2",
    accessibilityLabel: "Heading 2",
    active: "isH2",
    bold: true,
  },
  {
    command: { name: "heading3" },
    label: "H3",
    accessibilityLabel: "Heading 3",
    active: "isH3",
    bold: true,
  },
  {
    command: { name: "bulletList" },
    label: "•",
    accessibilityLabel: "Bullet list",
    active: "isBulletList",
  },
  {
    command: { name: "orderedList" },
    label: "1.",
    accessibilityLabel: "Numbered list",
    active: "isOrderedList",
  },
  {
    command: { name: "taskList" },
    label: "☑",
    accessibilityLabel: "Task list",
    active: "isTaskList",
  },
  {
    command: { name: "blockquote" },
    label: "❝",
    accessibilityLabel: "Quote",
    active: "isBlockquote",
  },
  {
    command: { name: "codeBlock" },
    label: "</>",
    accessibilityLabel: "Code block",
    active: "isCodeBlock",
  },
  {
    command: { name: "horizontalRule" },
    label: "—",
    accessibilityLabel: "Divider",
  },
  {
    command: { name: "undo" },
    label: "↶",
    accessibilityLabel: "Undo",
    active: "canUndo",
  },
  {
    command: { name: "redo" },
    label: "↷",
    accessibilityLabel: "Redo",
    active: "canRedo",
  },
];

interface EditorToolbarProps {
  state: FormatState | null;
  onCommand(command: EditorCommand): void;
}

/**
 * Compact formatting row for the native editor. Commands travel over the
 * WebView bridge; active state comes back from the same derivation the web
 * toolbar uses.
 */
export function EditorToolbar({ state, onCommand }: EditorToolbarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.bar, { borderColor: theme.backgroundSelected }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
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
                  backgroundColor: active
                    ? theme.backgroundSelected
                    : "transparent",
                  opacity: pressed ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.label,
                  button.bold ? styles.bold : null,
                  { color: active ? theme.text : theme.textSecondary },
                ]}
              >
                {button.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  content: {
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  label: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: "700" },
});
