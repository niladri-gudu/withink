import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import UnderlineExt from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

/**
 * The one TipTap extension list.
 *
 * Web renders it through `@tiptap/react`; any other editor surface (the
 * native WebView bridge, fixtures, the parity spike) must use this factory so
 * the schema, marks and serialized HTML can never drift between platforms.
 */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    UnderlineExt,
    ImageExt.configure({ inline: false, allowBase64: true }),
    Link.configure({
      openOnClick: false,
      // These attributes are part of the serialized HTML; both clients keep
      // them so a round-trip on either side is byte-identical.
      HTMLAttributes: {
        rel: "noopener noreferrer",
        class: "text-accent underline cursor-pointer",
      },
    }),
    Placeholder.configure({
      placeholder: "Start writing your thoughts...",
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    CharacterCount,
  ];
}
