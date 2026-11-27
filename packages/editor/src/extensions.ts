import type { NodeViewRenderer } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import UnderlineExt from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export interface EditorExtensionOptions {
  /**
   * Maps a stored image `src` to what the page should display.
   *
   * The native client's media proxy is private, and a WebView cannot attach
   * Authorization headers to `<img>` loads. The host resolves each URL to a
   * local data URI and pushes it here; the node view renders that source while
   * the document keeps the canonical `src`, so snapshots stay byte-identical
   * to the web editor's.
   */
  imageSrc?: (src: string) => string | null | undefined;
}

/** 1×1 transparent GIF: keeps `img` from painting a broken-image icon. */
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function createImageExtension(imageSrc: EditorExtensionOptions["imageSrc"]) {
  const base = ImageExt.configure({ inline: false, allowBase64: true });
  if (!imageSrc) return base;
  const resolve = imageSrc;

  const addNodeView = (): NodeViewRenderer => ({ node: initialNode }) => {
    const img = document.createElement("img");
    let currentNode = initialNode;

    const apply = () => {
      const source =
        typeof currentNode.attrs.src === "string" ? currentNode.attrs.src : "";
      const alt =
        typeof currentNode.attrs.alt === "string" ? currentNode.attrs.alt : "";
      img.setAttribute("data-wi-src", source);
      img.alt = alt;
      const resolved = source ? resolve(source) : null;
      if (resolved) {
        img.src = resolved;
        img.removeAttribute("data-wi-pending");
      } else {
        // Wait for the host behind a neutral block, never a broken icon.
        img.src = TRANSPARENT_PIXEL;
        img.setAttribute("data-wi-pending", "true");
      }
    };

    apply();

    return {
      dom: img,
      update: (updated) => {
        if (updated.type.name !== currentNode.type.name) return false;
        currentNode = updated;
        apply();
        return true;
      },
    };
  };

  return base.extend({ addNodeView });
}

/**
 * The one TipTap extension list.
 *
 * Web renders it through `@tiptap/react`; the native WebView bridge and the
 * parity fixtures use it too, so the schema, marks and serialized HTML can
 * never drift between platforms. Any extension change is a contract change:
 * regenerate the fixtures in the same commit.
 */
export function createEditorExtensions(
  options: EditorExtensionOptions = {},
) {
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
    createImageExtension(options.imageSrc),
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
