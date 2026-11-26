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
 * Web renders it through `@tiptap/react`; the native WebView bridge and the
 * parity fixtures use it too, so the schema, marks and serialized HTML can
 * never drift between platforms. Any extension change is a contract change:
 * regenerate the fixtures in the same commit.
 */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // StarterKit 3 ships default Link/Underline; disable its copies so the
      // configured ones below are the only schema — otherwise the duplicates
      // are ignored with a warning and Link's rel/class never apply.
      link: false,
      underline: false,
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
