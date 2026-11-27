import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ComponentRef,
} from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import type {
  EditorCommand,
  EditorContentInput,
  EditorSnapshot,
  EditorTheme,
  FormatState,
} from "@withink/editor";
import type {
  EditorToHostMessage,
  HostToEditorMessage,
} from "@withink/editor/protocol";

import { EDITOR_HTML } from "@/lib/editor-webview.generated";

/**
 * Native host for the shared TipTap editor.
 *
 * The document runs in a WebView bundled with the app (see
 * `@withink/editor`), so the schema and serialized HTML are exactly the web
 * editor's — the bridge only moves snapshots and commands. Commands sent
 * before the page reports `ready` are queued; `flush()` waits for the page's
 * acknowledgement so a save on back never races teardown.
 */

const FLUSH_TIMEOUT_MS = 4_000;
const MAX_QUEUED_CALLS = 100;

const EDITOR_SOURCE = { html: EDITOR_HTML, baseUrl: "https://localhost/" };

export interface RichTextEditorHandle {
  /** Returns the current document even if the debounce has not fired yet. */
  flush(): Promise<EditorSnapshot | null>;
  runCommand(command: EditorCommand): void;
  focus(): void;
  blur(): void;
  setEditable(editable: boolean): void;
  /** Displays a private image from a local data URI without changing the doc. */
  addImageSource(src: string, dataUri: string): void;
}

interface RichTextEditorProps {
  initialContent: EditorContentInput;
  theme: EditorTheme;
  editable?: boolean;
  /** Stored media URL → local data URI, hydrated by the host. */
  imageSources?: Record<string, string>;
  onSnapshot(snapshot: EditorSnapshot): void;
  /** Normalized content after `setContent`, used as the save baseline. */
  onLoaded?(snapshot: EditorSnapshot): void;
  onStateChange?(state: FormatState): void;
  onFocusChange?(focused: boolean): void;
  onError?(message: string): void;
}

function RichTextEditorImpl(
  {
    initialContent,
    theme,
    editable = true,
    imageSources,
    onSnapshot,
    onLoaded,
    onStateChange,
    onFocusChange,
    onError,
  }: RichTextEditorProps,
  ref: React.ForwardedRef<RichTextEditorHandle>,
) {
  const webRef = useRef<ComponentRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const nextIdRef = useRef(0);
  const pendingRef = useRef(
    new Map<number, (snapshot: EditorSnapshot | null) => void>(),
  );
  const initialRef = useRef(initialContent);
  const themeRef = useRef(theme);
  const editableRef = useRef(editable);
  const initContentIdRef = useRef<number | null>(null);
  const imageSourcesRef = useRef<Record<string, string>>(imageSources ?? {});
  const sentImageSourcesRef = useRef<Set<string>>(new Set());
  const handlersRef = useRef({
    onSnapshot,
    onLoaded,
    onStateChange,
    onFocusChange,
    onError,
  });

  useEffect(() => {
    handlersRef.current = {
      onSnapshot,
      onLoaded,
      onStateChange,
      onFocusChange,
      onError,
    };
  });

  const injectNow = useCallback((message: HostToEditorMessage) => {
    webRef.current?.injectJavaScript(
      `window.__withinkEditorReceive(${JSON.stringify(message)}); true;`,
    );
  }, []);

  const send = useCallback(
    (message: HostToEditorMessage) => {
      if (readyRef.current) {
        injectNow(message);
        return;
      }
      if (queueRef.current.length >= MAX_QUEUED_CALLS) return;
      queueRef.current.push(
        `window.__withinkEditorReceive(${JSON.stringify(message)}); true;`,
      );
    },
    [injectNow],
  );

  const sendImageSource = useCallback(
    (src: string, dataUri: string) => {
      imageSourcesRef.current[src] = dataUri;
      // Before `ready` the page has no editor yet; the ready handler sends
      // every stored source after `setContent`.
      if (!readyRef.current) return;
      sentImageSourcesRef.current.add(src);
      injectNow({ id: ++nextIdRef.current, type: "setImageSource", src, dataUri });
    },
    [injectNow],
  );

  useEffect(() => {
    themeRef.current = theme;
    editableRef.current = editable;
    if (!readyRef.current) return;
    send({ id: ++nextIdRef.current, type: "setTheme", theme });
    send({ id: ++nextIdRef.current, type: "setEditable", editable });
  }, [theme, editable, send]);

  useEffect(() => {
    if (!imageSources) return;
    for (const [src, dataUri] of Object.entries(imageSources)) {
      if (sentImageSourcesRef.current.has(src)) continue;
      sendImageSource(src, dataUri);
    }
  }, [imageSources, sendImageSource]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: EditorToHostMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as EditorToHostMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case "ready": {
          readyRef.current = true;
          const queued = queueRef.current;
          queueRef.current = [];
          for (const call of queued) {
            webRef.current?.injectJavaScript(call);
          }
          injectNow({
            id: ++nextIdRef.current,
            type: "setTheme",
            theme: themeRef.current,
          });
          const contentId = ++nextIdRef.current;
          initContentIdRef.current = contentId;
          injectNow({
            id: contentId,
            type: "setContent",
            content: initialRef.current,
          });
          if (!editableRef.current) {
            injectNow({
              id: ++nextIdRef.current,
              type: "setEditable",
              editable: false,
            });
          }
          // Re-send after `setContent` (and after a WebView reload) so the
          // node views pick up previews that were resolved before `ready`.
          for (const [src, dataUri] of Object.entries(imageSourcesRef.current)) {
            sentImageSourcesRef.current.add(src);
            injectNow({
              id: ++nextIdRef.current,
              type: "setImageSource",
              src,
              dataUri,
            });
          }
          break;
        }
        case "snapshot":
          handlersRef.current.onSnapshot(message.snapshot);
          handlersRef.current.onStateChange?.(message.state);
          break;
        case "state":
          handlersRef.current.onStateChange?.(message.state);
          break;
        case "focus":
          handlersRef.current.onFocusChange?.(true);
          break;
        case "blur":
          handlersRef.current.onFocusChange?.(false);
          break;
        case "ack": {
          if (message.id === initContentIdRef.current) {
            initContentIdRef.current = null;
            if (message.snapshot) {
              handlersRef.current.onLoaded?.(message.snapshot);
            }
            break;
          }
          const resolve = pendingRef.current.get(message.id);
          if (resolve) {
            pendingRef.current.delete(message.id);
            resolve(message.snapshot);
          }
          break;
        }
        case "error":
          handlersRef.current.onError?.(message.message);
          break;
      }
    },
    [injectNow],
  );

  // A WebView reload (process death, navigation) drops all page state; treat
  // the next `ready` as a fresh boot so content and previews are re-sent.
  const handleLoadStart = useCallback(() => {
    readyRef.current = false;
    queueRef.current = [];
    sentImageSourcesRef.current.clear();
  }, []);

  const flush = useCallback((): Promise<EditorSnapshot | null> => {
    if (!readyRef.current) return Promise.resolve(null);
    const id = ++nextIdRef.current;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        resolve(null);
      }, FLUSH_TIMEOUT_MS);
      pendingRef.current.set(id, (snapshot) => {
        clearTimeout(timer);
        resolve(snapshot);
      });
      injectNow({ id, type: "flush" });
    });
  }, [injectNow]);

  useImperativeHandle(
    ref,
    () => ({
      flush,
      runCommand: (command) =>
        send({ id: ++nextIdRef.current, type: "command", command }),
      focus: () => send({ id: ++nextIdRef.current, type: "focus" }),
      blur: () => send({ id: ++nextIdRef.current, type: "blur" }),
      setEditable: (value) =>
        send({ id: ++nextIdRef.current, type: "setEditable", editable: value }),
      addImageSource: (src, dataUri) => sendImageSource(src, dataUri),
    }),
    [flush, send, sendImageSource],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView
        ref={webRef}
        allowFileAccess={false}
        containerStyle={styles.webview}
        domStorageEnabled={false}
        hideKeyboardAccessoryView
        javaScriptEnabled
        keyboardDisplayRequiresUserAction={false}
        mixedContentMode="never"
        onLoadStart={handleLoadStart}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        scrollEnabled
        setSupportMultipleWindows={false}
        source={EDITOR_SOURCE}
        style={styles.webview}
      />
    </View>
  );
}

export const RichTextEditor = memo(
  forwardRef<RichTextEditorHandle, RichTextEditorProps>(RichTextEditorImpl),
);
RichTextEditor.displayName = "RichTextEditor";

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
