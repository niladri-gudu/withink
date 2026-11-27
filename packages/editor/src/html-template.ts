import type { EditorTheme } from "./types";

/**
 * The WebView document. `renderEditorHtml` inlines the single-file TipTap
 * bundle produced by `scripts/build-webview.mjs`, so the editor works offline
 * and never depends on the web origin.
 */

export const DEFAULT_EDITOR_THEME: EditorTheme = {
  text: "#000000",
  background: "transparent",
  muted: "#60646C",
  accent: "#208AEF",
  border: "#E0E1E6",
  codeBackground: "#F0F0F3",
};

const EDITOR_CSS = `
:root {
  --wi-text: #000000;
  --wi-muted: #60646C;
  --wi-accent: #208AEF;
  --wi-border: #E0E1E6;
  --wi-code: #F0F0F3;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: transparent;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}
body {
  color: var(--wi-text);
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-size: 17px;
  line-height: 1.65;
  overscroll-behavior: contain;
}
#editor {
  min-height: 100vh;
  padding: 8px 2px 120px;
  outline: none;
}
.ProseMirror {
  min-height: 60vh;
  outline: none;
  caret-color: var(--wi-accent);
  overflow-wrap: break-word;
  -webkit-user-select: text;
  user-select: text;
}
.ProseMirror > * + * { margin-top: 0.75em; }
.ProseMirror p { margin: 0; }
.ProseMirror h1 { font-size: 1.75em; line-height: 1.25; font-weight: 700; margin: 0.8em 0 0.4em; }
.ProseMirror h2 { font-size: 1.4em; line-height: 1.3; font-weight: 700; margin: 0.8em 0 0.4em; }
.ProseMirror h3 { font-size: 1.15em; line-height: 1.35; font-weight: 600; margin: 0.8em 0 0.4em; }
.ProseMirror h1:first-child, .ProseMirror h2:first-child, .ProseMirror h3:first-child { margin-top: 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.4em; margin: 0.5em 0; }
.ProseMirror li p { margin: 0; }
.ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}
.ProseMirror ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-top: 0.35em;
  user-select: none;
}
.ProseMirror ul[data-type="taskList"] li > div { flex: 1; }
.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--wi-accent);
}
.ProseMirror blockquote {
  border-left: 3px solid var(--wi-border);
  margin: 0.75em 0;
  padding-left: 1em;
  color: var(--wi-muted);
}
.ProseMirror pre {
  background: var(--wi-code);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  line-height: 1.5;
}
.ProseMirror pre code {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}
.ProseMirror code {
  background: var(--wi-code);
  border-radius: 4px;
  padding: 0.1em 0.3em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}
.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--wi-border);
  margin: 1.5em 0;
}
.ProseMirror a {
  color: var(--wi-accent);
  text-decoration: underline;
}
.ProseMirror img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.75em 0;
}
/* The native host paints a placeholder until it resolves the private URL. */
.ProseMirror img[data-wi-pending] {
  width: 100%;
  min-height: 140px;
  background: var(--wi-code);
}
.ProseMirror mark { border-radius: 3px; padding: 0 0.1em; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--wi-muted);
  float: left;
  height: 0;
  pointer-events: none;
}
::selection { background: rgba(32, 138, 239, 0.25); }
`;

/**
 * Built-ins TipTap calls that the device WebView may not have.
 *
 * esbuild downlevels syntax but never polyfills built-ins. Android WebView is
 * updated independently of the app, and devices stuck on Chrome < 97 (the
 * Pixel 4 emulator ships 91) have no `Array.prototype.findLast`; TipTap's
 * transaction handler calls it on every focus/blur, so the editor otherwise
 * throws "findLast is not a function" on load.
 */
const EDITOR_POLYFILLS = `
(function () {
  if (!Array.prototype.findLast) {
    Object.defineProperty(Array.prototype, "findLast", {
      configurable: true,
      writable: true,
      value: function (predicate, thisArg) {
        for (var index = this.length - 1; index >= 0; index -= 1) {
          if (predicate.call(thisArg, this[index], index, this)) return this[index];
        }
        return undefined;
      },
    });
  }
  if (!Array.prototype.findLastIndex) {
    Object.defineProperty(Array.prototype, "findLastIndex", {
      configurable: true,
      writable: true,
      value: function (predicate, thisArg) {
        for (var index = this.length - 1; index >= 0; index -= 1) {
          if (predicate.call(thisArg, this[index], index, this)) return index;
        }
        return -1;
      },
    });
  }
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, "at", {
      configurable: true,
      writable: true,
      value: function (index) {
        var length = this.length;
        var position = index < 0 ? length + index : index;
        return position < 0 || position >= length ? undefined : this[position];
      },
    });
  }
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, "at", {
      configurable: true,
      writable: true,
      value: function (index) {
        var value = String(this);
        var position = index < 0 ? value.length + index : index;
        return position < 0 || position >= value.length ? undefined : value.charAt(position);
      },
    });
  }
  if (!Object.hasOwn) {
    Object.hasOwn = function (object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    };
  }
})();
`;

/**
 * Inline the bundle into a single document. `</script` is escaped so a string
 * inside the bundle can never terminate the script element early.
 */
export function renderEditorHtml(bundle: string): string {
  const script = bundle.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>${EDITOR_CSS}</style>
</head>
<body>
<div id="editor"></div>
<script>${EDITOR_POLYFILLS}</script>
<script>${script}</script>
</body>
</html>`;
}
