"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
import { Calendar } from "@withink/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@withink/ui/popover";
import { cn } from "@withink/utils";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { addDays, formatDisplayDate, formatNumericDate } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import type { ResolvedPlan } from "@/features/billing/config/plans";
import { decryptText, encryptText } from "@/lib/crypto-client";
import { useEncryption } from "@/providers/encryption-provider";
import { EditorToolbarDock } from "@/features/journal/components/editor/editor-toolbar-dock";
import TiptapEditor from "@/features/journal/components/editor/tiptap-editor";

import {
  deleteLetterAction,
  sealLetterAction,
  upsertLetterAction,
  type LetterFullRecord,
} from "../actions/letter-actions";

interface LetterComposerProps {
  /** Owned active letter when editing; null when composing fresh. */
  initialLetter: LetterFullRecord | null;
  plan: ResolvedPlan;
  limit: number;
  /** How many active letters the user already holds (excluding the edited one). */
  activeCount: number;
  today: string;
  accountEncrypted: boolean;
}

function looksCipher(value: unknown): value is string {
  return typeof value === "string" && value.includes(":");
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Local-time ISO day for a Date (viewer-local semantics, same as entries). */
function toIsoDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function LetterComposer({
  initialLetter,
  plan,
  limit,
  activeCount,
  today,
  accountEncrypted,
}: LetterComposerProps) {
  const router = useRouter();
  const { isClientEncrypted, masterKey } = useEncryption();
  const encrypted = accountEncrypted && isClientEncrypted;

  const [letterId, setLetterId] = useState<string | null>(
    initialLetter?.id ?? null,
  );
  const [title, setTitle] = useState("");
  const [unlockDate, setUnlockDate] = useState(initialLetter?.unlockDate ?? "");
  const [sealed, setSealed] = useState(initialLetter?.sealed ?? false);
  // Fresh letters have nothing to decrypt: start ready immediately. Existing
  // ones stay `null` (spinner) until the decrypt effect resolves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decryptedContent, setDecryptedContent] = useState<any>(
    initialLetter ? null : {},
  );
  const [editorContent, setEditorContent] = useState({ html: "", text: "", json: {} });
  const [editorInstance, setEditorInstance] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sealConfirmOpen, setSealConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Paywall trips immediately for Free/Plus users already at their cap —
  // before they type a single word into a letter that can never be saved.
  const [paywallOpen, setPaywallOpen] = useState(
    () => plan !== "pro" && activeCount >= limit,
  );
  const [sealing, setSealing] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lastSavedPayloadRef = useRef<string>(initialLetter ? "" : "{}");
  const letterIdRef = useRef<string | null>(letterId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  /** Set on successful delete — autosave must never resurrect the dead. */
  const deletedRef = useRef(false);
  useEffect(() => {
    letterIdRef.current = letterId;
  }, [letterId]);

  // --- Decrypt-or-empty editor seeding -------------------------------------
  useEffect(() => {
    if (!initialLetter) return; // lazy state init already made it ready
    if (!encrypted || !masterKey) return; // spinner until the key lands
    let cancelled = false;
    void (async () => {
      try {
        const dec = async <T,>(value: T): Promise<T> => {
          if (!looksCipher(value)) return value;
          const raw = await decryptText(value, masterKey);
          return JSON.parse(raw) as T;
        };
        const nextTitle = looksCipher(initialLetter.title)
          ? await decryptText(initialLetter.title, masterKey)
          : initialLetter.title;
        const nextJson = (await dec(initialLetter.contentJson)) ?? {};
        const nextHtml = await dec(initialLetter.contentHtml);
        const nextText = await dec(initialLetter.contentText);
        if (cancelled) return;
        setTitle(nextTitle);
        setUnlockDate(initialLetter.unlockDate);
        setSealed(initialLetter.sealed);
        setDecryptedContent(nextJson);
        setEditorContent({
          html: nextHtml ?? "",
          text: nextText ?? "",
          json: nextJson,
        });
        // The server record IS the last saved payload — never re-save it.
        lastSavedPayloadRef.current = JSON.stringify({
          unlockDate: initialLetter.unlockDate,
          sealed: initialLetter.sealed,
          title: nextTitle,
          contentText: nextText ?? "",
          contentHtml: nextHtml ?? "",
          contentJson: nextJson,
          wordCount: initialLetter.wordCount,
        });
      } catch {
        toast.error("This letter couldn't be decrypted. Unlock and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encrypted, masterKey]);

  const ready =
    decryptedContent !== null && (!encrypted || !!masterKey);

  // --- Server-direct autosave (online-only by design) ----------------------
  const buildPlainPayload = useCallback(
    (
      nextTitle: string,
      json: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      nextDate: string,
    ) => ({
      unlockDate: nextDate,
      sealed,
      title: nextTitle,
      contentText: editorContent.text,
      contentHtml: editorContent.html,
      contentJson: json,
      wordCount: countWords(editorContent.text),
    }),
    [editorContent.text, editorContent.html, sealed],
  );

  const doSave = useCallback(async (): Promise<boolean> => {
    if (deletedRef.current) return false;
    if (savingRef.current) return false; // single-flight: timer+pagehide races
    if (!letterIdRef.current && !decryptedContent) return false;
    // The LIVE editor document is the source of truth for content fields —
    // `decryptedContent` is only the mount-time seed for existing letters.
    const payload = buildPlainPayload(title, editorContent.json, unlockDate);
    const signature = JSON.stringify(payload);
    if (signature === lastSavedPayloadRef.current) return true;

    setSaveState("saving");
    savingRef.current = true;

    // Zero-knowledge: encrypt every text field client-side; the server
    // stores ciphertext verbatim. Legacy accounts post plaintext.
    let out: Record<string, unknown> = { ...payload };
    if (encrypted && masterKey) {
      try {
        out = {
          unlockDate: payload.unlockDate,
          sealed: payload.sealed,
          wordCount: payload.wordCount,
          title: payload.title ? await encryptText(payload.title, masterKey) : "",
          contentHtml: payload.contentHtml
            ? await encryptText(payload.contentHtml, masterKey)
            : "",
          contentText: payload.contentText
            ? await encryptText(payload.contentText, masterKey)
            : "",
          contentJson:
            payload.contentJson && Object.keys(payload.contentJson).length > 0
              ? await encryptText(JSON.stringify(payload.contentJson), masterKey)
              : {},
        };
      } catch {
        setSaveState("error");
        savingRef.current = false;
        return false;
      }
    }

    const res = await upsertLetterAction({
      letterId: letterIdRef.current ?? undefined,
      ...out,
    });
    savingRef.current = false;
    if (!res.success) {
      if (res.code === "LETTER_LIMIT_REACHED") {
        setPaywallOpen(true);
      } else if (res.code === "LETTER_FROZEN") {
        toast.error(res.error ?? "Delivered letters can no longer be changed.");
        router.push("/letters" as Parameters<typeof router.push>[0]);
        return false;
      }
      setSaveState("error");
      return false;
    }
    if (res.data) {
      if (!letterIdRef.current) {
        setLetterId(res.data.id);
        letterIdRef.current = res.data.id;
      }
      if (res.data.sealed !== sealed) setSealed(res.data.sealed);
    }
    lastSavedPayloadRef.current = signature;
    setSaveState("saved");
    return true;
  }, [
    buildPlainPayload,
    decryptedContent,
    editorContent.json,
    encrypted,
    masterKey,
    router,
    sealed,
    title,
    unlockDate,
  ]);

  useEffect(() => {
    if (!ready) return;
    // Empty drafts never auto-save: an unlock date and some ink are the
    // minimum a letter needs before it earns a server round-trip.
    const hasInk = title.trim() || editorContent.text.trim();
    if (!unlockDate || !hasInk) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void doSave();
    }, 1500);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [title, unlockDate, editorContent.html, editorContent.text, editorContent.json, ready, doSave]);

  // Flush pending changes when the tab hides or the page unloads. The ref
  // indirection keeps this mount-only: doSave changes identity every render,
  // and depending on it here would flush (and save) on every keystroke.
  const doSaveRef = useRef(doSave);
  useEffect(() => {
    doSaveRef.current = doSave;
  }, [doSave]);
  useEffect(() => {
    const flush = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void doSaveRef.current();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // Keyboard avoidance moved into EditorToolbarDock (shared with the journal
  // editor). The reported offset keeps the caret's scroll-padding honest so
  // the toolbar never covers the line being written.
  const [toolbarBottom, setToolbarBottom] = useState(16);
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollPaddingBottom = `${toolbarBottom + 120}px`;
    return () => {
      root.style.scrollPaddingBottom = "0px";
    };
  }, [toolbarBottom]);

  // --- Seal / delete -------------------------------------------------------
  const handleSeal = useCallback(async () => {
    setSealing(true);
    const flushed = await doSave();
    if (!flushed) {
      setSealing(false);
      setSealConfirmOpen(false);
      toast.error("The letter wasn't saved, so it wasn't sealed. Try again.");
      return;
    }
    const res = await sealLetterAction(letterIdRef.current ?? "");
    setSealing(false);
    setSealConfirmOpen(false);
    if (!res.success) {
      toast.error(res.error ?? "Couldn't seal the letter.");
      return;
    }
    setSealed(true);
    toast.success(
      `Sealed. It opens ${formatDisplayDate(unlockDate || today)}.`,
    );
    // Refresh alongside the push: the letters RSC snapshot in the router
    // cache is stale after a create — the shelf must show the new letter NOW.
    // Both calls share ONE transition: a bare refresh() after push() can win
    // the race and cancel the navigation (observed on the delete path).
    startTransition(() => {
      router.push("/letters" as Parameters<typeof router.push>[0]);
      router.refresh();
    });
  }, [doSave, router, today, unlockDate]);

  const handleDelete = useCallback(async () => {
    if (!letterIdRef.current) return;
    setDeleting(true);
    const res = await deleteLetterAction(letterIdRef.current);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error ?? "Couldn't delete the letter.");
      return;
    }
    // Dead letter: no in-flight or later autosave may resurrect it, and the
    // confirm dialog must close NOW — a toast over a stuck popup is worse
    // than no toast.
    deletedRef.current = true;
    setDeleteConfirmOpen(false);
    toast.success("The letter was deleted.");
    startTransition(() => {
      router.push("/letters" as Parameters<typeof router.push>[0]);
      router.refresh();
    });
  }, [router]);

  const minDateObj = useMemo(
    () => new Date(`${addDays(today, 1)}T00:00:00`),
    [today],
  );
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "";

  return (
    <div className="relative flex min-h-full w-full flex-col">
      {/* The open page: the same ruled ground the journal editor writes on. */}
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto w-full max-w-3xl px-4 pt-5 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8">
        {/* Header row: back · hand note · save state */}
        <div className="border-border/40 flex items-center gap-2 border-b pb-3">
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link
              href="/letters"
              aria-label="Back to letters"
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-muted-foreground/70 font-hand truncate text-lg leading-none">
            {initialLetter ? "an unfinished letter" : "a letter in the making"}
          </span>
          <div className="flex-1" />
          <span
            aria-live="polite"
            className={cn(
              "text-caption tabular-nums",
              saveState === "error"
                ? "text-destructive"
                : "text-muted-foreground/60",
            )}
          >
            {saveLabel}
          </span>
        </div>

        {/* Envelope fields */}
        <div className="mt-6 space-y-4">
          <div
            aria-hidden="true"
            className="from-accent/60 via-accent/25 h-[2px] w-24 rounded-full bg-gradient-to-r to-transparent"
          />
          <input
            placeholder="Dear future me…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Letter title"
            className="text-foreground placeholder:text-muted-foreground/30 w-full bg-transparent font-serif text-3xl leading-tight font-bold tracking-tight outline-none sm:text-4xl"
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 gap-2 font-serif"
                  aria-label="Choose the day this letter opens"
                >
                  <CalendarIcon className="text-muted-foreground h-4 w-4" />
                  {unlockDate ? formatNumericDate(unlockDate) : "Choose a day"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={
                    unlockDate ? new Date(`${unlockDate}T00:00:00`) : undefined
                  }
                  onSelect={(date) => {
                    if (date) setUnlockDate(toIsoDay(date));
                    setDateOpen(false);
                  }}
                  disabled={{ before: minDateObj }}
                  defaultMonth={
                    unlockDate ? new Date(`${unlockDate}T00:00:00`) : minDateObj
                  }
                />
              </PopoverContent>
            </Popover>
            <p className="text-muted-foreground/70 font-hand text-base">
              {unlockDate
                ? "it opens on its day — never before"
                : "pick the day it should wake up"}
            </p>
          </div>
        </div>

        {/* Editor surface — the toolbar lives in the fixed bottom chrome */}
        <div className="prose-container mt-6">
          {!ready ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-accent h-6 w-6 animate-spin" />
            </div>
          ) : (
            <TiptapEditor
              // Stable per composing session: a key derived from letterId
              // would remount (and visually wipe) the editor the moment a
              // fresh draft earns its server id.
              key={initialLetter?.id ?? "new"}
              content={decryptedContent}
              onChange={setEditorContent}
              onEditorReady={setEditorInstance}
            />
          )}
        </div>

        {/* Seal / delete footer */}
        <div className="border-border/60 mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
          {letterId && (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button
            onClick={() => setSealConfirmOpen(true)}
            disabled={!unlockDate || !ready}
            className="h-11"
          >
            Seal letter
          </Button>
        </div>
      </div>

      {/* Fixed bottom formatting toolbar — the SAME dock the journal editor
          uses (content-column centering, keyboard avoidance, entrance
          motion). Its offset feeds the caret's scroll-padding. */}
      <EditorToolbarDock
        editor={editorInstance}
        onBottomChange={setToolbarBottom}
      />

      <ConfirmDialog
        open={sealConfirmOpen}
        onOpenChange={setSealConfirmOpen}
        title="Seal this letter?"
        description={`It opens on ${formatDisplayDate(unlockDate || today)}. Once sealed, it can't be read or edited until that day — deleting it stays possible.`}
        confirmLabel="Seal it"
        pending={sealing}
        onConfirm={() => void handleSeal()}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this letter?"
        description="Everything written in it will be gone for good."
        confirmLabel="Delete letter"
        pending={deleting}
        onConfirm={() => void handleDelete()}
      />

      <UpgradeDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason="letters"
        plan={plan}
      />
    </div>
  );
}
