"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { IconButton } from "@withink/ui/icon-button";
import { cn } from "@withink/utils";
import {
  CalendarClock,
  Loader2,
  Mail,
  MailOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { formatDisplayDate } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import type { ResolvedPlan } from "@/features/billing/config/plans";
import { useEncryption } from "@/providers/encryption-provider";
import { decryptText } from "@/lib/crypto-client";

import {
  deleteLetterAction,
  getLetterForComposeAction,
  listLettersAction,
  revealLetterAction,
} from "../actions/letter-actions";
import { countdownFor, isDelivered } from "../lib/letter-rules";
import type { LetterMetaRecord } from "../services/letter-service";

interface LettersShellProps {
  initialLetters: LetterMetaRecord[];
  plan: ResolvedPlan;
  limit: number;
  /** Server-resolved viewer-local today (YYYY-MM-DD). */
  today: string;
  /** Whether the account stores client-encrypted content (ZK). */
  accountEncrypted: boolean;
}

/** Heuristic twins of the editor's cipher detection (`"iv:cipher"` payloads). */
function looksCipher(value: unknown): value is string {
  return typeof value === "string" && value.includes(":");
}

/**
 * Slip icons read at a glance: a closed envelope = not yet read, an open
 * one = read. The wax seal disc lives only in the reader's breaking moment.
 */
function EnvelopeDisc({ open = false }: { open?: boolean }) {
  return open ? (
    <span className="border-accent/40 text-accent/70 flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed">
      <MailOpen className="h-4 w-4" aria-hidden="true" />
    </span>
  ) : (
    <span className="border-accent/40 bg-accent/10 text-accent flex size-9 shrink-0 items-center justify-center rounded-full border">
      <Mail className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

/** The reflection sheet's gold edge, marking letters that demand attention. */
function GoldEdge() {
  return (
    <div
      aria-hidden="true"
      className="from-accent/60 via-accent/25 absolute top-0 right-0 left-0 h-[2px] rounded-t-xl bg-gradient-to-r to-transparent"
    />
  );
}

/** Faint ledger ruling behind a letter slip — the open page, not a grid. */
function SlipRules() {
  return <div aria-hidden="true" className="ledger-rules pointer-events-none absolute inset-0 opacity-70" />;
}

export function LettersShell({
  initialLetters,
  plan,
  limit,
  today,
  accountEncrypted,
}: LettersShellProps) {
  const [letters, setLetters] = useState(initialLetters);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LetterMetaRecord | null>(
    null,
  );
  const [readerId, setReaderId] = useState<string | null>(null);
  /** The letter currently being unsealed (drives the one signature moment). */
  const [unsealingId, setUnsealingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const { isClientEncrypted, masterKey } = useEncryption();
  const encrypted = accountEncrypted && isClientEncrypted;

  // ZK titles arrive as ciphertext in the RSC stream; decrypt locally once
  // the master key lands. Plaintext accounts read straight through.
  const [decryptedTitles, setDecryptedTitles] = useState<
    Record<string, string>
  >({});
  const titlesReady =
    !encrypted || Object.keys(decryptedTitles).length >= letters.length;

  useEffect(() => {
    if (!encrypted || !masterKey) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const letter of letters) {
        if (letter.title && looksCipher(letter.title)) {
          try {
            next[letter.id] = await decryptText(letter.title, masterKey);
          } catch {
            next[letter.id] = "";
          }
        } else {
          next[letter.id] = letter.title;
        }
        if (cancelled) return;
      }
      setDecryptedTitles(next);
    })();
    return () => {
      cancelled = true;
    };
    // Re-run when the set changes (create/delete).
  }, [encrypted, masterKey, letters]);

  const titleOf = useCallback(
    (letter: LetterMetaRecord) => (encrypted ? (decryptedTitles[letter.id] ?? "") : letter.title),
    [encrypted, decryptedTitles],
  );

  const active = useMemo(
    () =>
      letters
        .filter((l) => !isDelivered(l.unlockDate, today))
        .sort((a, b) => a.unlockDate.localeCompare(b.unlockDate)),
    [letters, today],
  );
  const arrived = useMemo(
    () =>
      letters
        .filter((l) => isDelivered(l.unlockDate, today))
        .sort((a, b) => b.unlockDate.localeCompare(a.unlockDate)),
    [letters, today],
  );
  const arrivedUnread = arrived.filter((l) => l.readAt === null);

  const activeCount = active.length;
  const atLimit = plan !== "pro" && activeCount >= limit;

  const refresh = () => {
    startTransition(async () => {
      const res = await listLettersAction();
      if (res.success && res.data) setLetters(res.data);
      router.refresh();
    });
  };

  const handleNewClick = () => {
    if (atLimit) {
      setPaywallOpen(true);
      return;
    }
    router.push("/letters/compose" as Parameters<typeof router.push>[0]);
  };

  const handleDelete = (target: LetterMetaRecord) => {
    setBusy(true);
    startTransition(async () => {
      const res = await deleteLetterAction(target.id);
      setBusy(false);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't delete the letter.");
        return;
      }
      // Close the confirm popup FIRST — a success toast over a stuck dialog
      // reads like nothing happened.
      setDeleteTarget(null);
      setReaderId(null);
      toast.success("The letter was deleted. Its day is free again.");
      refresh();
    });
  };

  // First reveal of an arrived letter stamps readAt server-side.
  const openReader = (letter: LetterMetaRecord) => {
    const isNewArrival =
      isDelivered(letter.unlockDate, today) && letter.readAt === null;
    setReaderId(letter.id);
    if (isNewArrival) setUnsealingId(letter.id);
    if (isNewArrival) {
      startTransition(async () => {
        const res = await revealLetterAction(letter.id);
        if (!res.success) {
          if (res.code === "LETTER_SEALED") {
            toast.error(res.error ?? "This letter isn't ready to open yet.");
            return;
          }
          return;
        }
        setLetters((prev) =>
          prev.map((l) =>
            l.id === letter.id
              ? { ...l, readAt: new Date().toISOString() }
              : l,
          ),
        );
        router.refresh();
      });
    }
  };

  return (
    <div className="w-full space-y-10">
      <header>
        <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
          <span className="text-running-head text-muted-foreground/70">
            Letters
          </span>
          <span className="text-caption text-muted-foreground/50 tabular-nums">
            {activeCount} active of{" "}
            {limit === Number.POSITIVE_INFINITY ? "∞" : limit}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
              sealed with intention
            </p>
            <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
              Letters to{" "}
              <span className="text-accent font-normal">future you.</span>
            </h1>
            <p className="text-body-small text-muted-foreground mt-1">
              Write today what you want to read later. Each letter opens on
              the day you choose — never before.
            </p>
          </div>
          <Button onClick={handleNewClick} className="h-11 shrink-0">
            <Plus className="h-4 w-4" /> New letter
          </Button>
        </div>
      </header>

      {/* Arrived and unopened: seals intact, waiting to be broken. */}
      {arrivedUnread.length > 0 && (
        <section aria-label="Letters that have arrived">
          <div className="space-y-3">
            {arrivedUnread.map((letter) => (
              <LetterSlip
                key={letter.id}
                letter={letter}
                title={titlesReady ? titleOf(letter) : ""}
                titlePending={!titlesReady}
                note={`a letter for you, from ${formatDisplayDate(
                  letter.createdAt.slice(0, 10),
                  { year: undefined },
                )}`}
                seal={<EnvelopeDisc />}
                edge
                onClick={() => openReader(letter)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sealed: still traveling toward their day. */}
      <section aria-label="Sealed letters">
        <h2 className="text-running-head text-muted-foreground/60 mb-3">
          Sealed
        </h2>
        {active.length === 0 ? (
          <EmptyLetters onNew={handleNewClick} />
        ) : (
          <div className="space-y-3">
            {active.map((letter, index) => {
              const note = countdownFor(letter.unlockDate, today);
              // A sealed letter is invisible even to its author until its
              // day: the slip shows title + countdown, the body stays shut.
              return letter.sealed ? (
                <LetterSlip
                  key={letter.id}
                  letter={letter}
                  folio={`${index + 1}`.padStart(2, "0")}
                  title={titlesReady ? titleOf(letter) : ""}
                  titlePending={!titlesReady}
                  note={`${note.label} · resting`}
                  seal={<EnvelopeDisc />}
                  onDelete={() => setDeleteTarget(letter)}
                />
              ) : (
                <LetterSlip
                  key={letter.id}
                  letter={letter}
                  folio={`${index + 1}`.padStart(2, "0")}
                  title={titlesReady ? titleOf(letter) : ""}
                  titlePending={!titlesReady}
                  note="still being written"
                  icon={
                    <Mail className="text-muted-foreground/60 h-4 w-4 shrink-0" />
                  }
                  onClick={() => openReader(letter)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Delivered archive */}
      {arrived.filter((l) => l.readAt !== null).length > 0 && (
        <section aria-label="Opened letters">
          <h2 className="text-running-head text-muted-foreground/60 mb-3">
            Opened
          </h2>
          <div className="space-y-3">
            {arrived
              .filter((l) => l.readAt !== null)
              .map((letter) => (
                <LetterSlip
                  key={letter.id}
                  letter={letter}
                  title={titlesReady ? titleOf(letter) : ""}
                  titlePending={!titlesReady}
                  note={`opened — ${formatDisplayDate(letter.unlockDate, {
                    year: undefined,
                  })}`}
                  seal={<EnvelopeDisc open />}
                  muted
                  onClick={() => openReader(letter)}
                />
              ))}
          </div>
        </section>
      )}

      {/* Reader — keyed by letterId so a switch remounts clean (no sync
          setState-in-effect). */}
      <LetterReaderDialog
        key={readerId ?? "closed"}
        letterId={readerId}
        unsealing={unsealingId !== null && unsealingId === readerId}
        onClose={() => {
          setReaderId(null);
          setUnsealingId(null);
        }}
        onDelete={(id) => {
          const target = letters.find((l) => l.id === id) ?? null;
          setReaderId(null);
          setUnsealingId(null);
          setDeleteTarget(target);
        }}
        encrypted={encrypted}
        today={today}
      />

      {/* Delete confirmation (the ONE destructive convention) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this letter?"
        description="Everything written in it will be gone for good. Its active slot is freed immediately."
        confirmLabel="Delete letter"
        pending={busy || pending}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
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

function SlipMeta({ letter }: { letter: LetterMetaRecord }) {
  return (
    <span className="text-caption text-muted-foreground/50 shrink-0 tabular-nums">
      {letter.wordCount > 0
        ? `${letter.wordCount} ${letter.wordCount === 1 ? "word" : "words"}`
        : "blank"}
    </span>
  );
}

/**
 * One letter as a codex slip: a ledger-ruled paper sheet carrying the seal,
 * the folio numeral, the title, and the hand note. Sealed slips are inert —
 * the body stays shut; arrived-unread slips carry the gold edge.
 */
function LetterSlip({
  letter,
  title,
  titlePending,
  note,
  seal,
  icon,
  folio,
  edge = false,
  muted = false,
  onClick,
  onDelete,
}: {
  letter: LetterMetaRecord;
  title: string;
  titlePending: boolean;
  note: string;
  seal?: React.ReactNode;
  icon?: React.ReactNode;
  folio?: string;
  edge?: boolean;
  muted?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const body = (
    <>
      {edge && <GoldEdge />}
      {letter.sealed && <SlipRules />}
      <div className="relative flex items-start gap-4">
        {seal ?? icon}
        {folio && (
          <span
            aria-hidden="true"
            className={cn(
              "w-5 shrink-0 pt-0.5 text-right font-serif text-[11px] tracking-[0.1em] tabular-nums",
              edge ? "text-accent" : "text-muted-foreground/50",
            )}
          >
            {folio}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {titlePending ? (
            <div className="bg-muted/60 h-4 w-1/2 animate-pulse rounded-md" />
          ) : (
            <p
              className={cn(
                "text-foreground truncate font-serif text-lg font-semibold",
                muted && "text-muted-foreground",
              )}
            >
              {title || "An untitled letter"}
            </p>
          )}
          <p className="text-muted-foreground/70 font-hand mt-0.5 text-base leading-snug">
            {note}
          </p>
        </div>
        {onDelete ? (
          <IconButton
            variant="ghost"
            aria-label={`Delete ${title || "untitled letter"}`}
            className="text-muted-foreground/50 opacity-70 hover:text-destructive hover:opacity-100"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ) : (
          <SlipMeta letter={letter} />
        )}
      </div>
    </>
  );

  if (!onClick) {
    // Sealed letters have no body access at all — not even for the author.
    // Deleting stays possible (the one mercy the envelope allows).
    return (
      <div
        aria-label={`${title || "An untitled letter"} — sealed until it opens`}
        className={cn(
          "bg-card relative overflow-hidden rounded-xl border p-5 select-none",
          muted && "bg-card/60",
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group bg-card relative w-full cursor-pointer overflow-hidden rounded-xl border p-5 text-left transition-all duration-200 focus-visible:ring-ring hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none hover:shadow-sm",
        muted && "bg-card/60",
      )}
    >
      {body}
    </button>
  );
}

function EmptyLetters({ onNew }: { onNew: () => void }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="bg-card/50 border-border/60 relative overflow-hidden rounded-xl border">
        <SlipRules />
        <div className="relative flex flex-col items-center px-6 py-10 text-center">
          <p className="text-muted-foreground/70 font-hand text-xl leading-snug">
            no letters are on their way yet
          </p>
          <p className="text-body-small text-muted-foreground mt-2">
            Write something your future self will thank you for.
          </p>
          <Button variant="outline" onClick={onNew} className="mt-5 h-11">
            <Plus className="h-4 w-4" /> Write a letter
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ReaderState {
  loading: boolean;
  title: string;
  paragraphs: string[];
  unlockDate: string;
  sealed: boolean;
  id: string;
}

function LetterReaderDialog({
  letterId,
  unsealing,
  onClose,
  onDelete,
  encrypted,
  today,
}: {
  letterId: string | null;
  /** True when this opening is a first reveal — the seal breaks. */
  unsealing: boolean;
  onClose: () => void;
  onDelete: (letterId: string) => void;
  encrypted: boolean;
  today: string;
}) {
  const { masterKey } = useEncryption();
  const reduceMotion = useReducedMotion();
  // The dialog remounts per letterId (keyed by the parent), so mount-time
  // initializers are the reset path — no setState-in-effect resets.
  const [state, setState] = useState<ReaderState | null>(null);
  const [failed, setFailed] = useState(false);
  const [sealBroken, setSealBroken] = useState(!unsealing);

  useEffect(() => {
    if (!letterId) return;

    let cancelled = false;
    void (async () => {
      const res = await getLetterForComposeAction(letterId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setFailed(true);
        return;
      }
      const letter = res.data;
      let title = letter.title;
      let text = letter.contentText;
      if (encrypted && masterKey) {
        try {
          if (title && looksCipher(title))
            title = await decryptText(title, masterKey);
          if (text && looksCipher(text))
            text = await decryptText(text, masterKey);
        } catch {
          setFailed(true);
          return;
        }
      }
      if (cancelled) return;
      const paragraphs = (text || "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      setState({
        loading: false,
        title,
        paragraphs,
        unlockDate: letter.unlockDate,
        sealed: letter.sealed,
        id: letter.id,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [letterId, encrypted, masterKey]);

  const note = state ? countdownFor(state.unlockDate, today) : null;

  return (
    <Dialog open={letterId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        {failed ? (
          <DialogHeader>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>
              The letter couldn&apos;t be read just now. Try again in a
              moment.
            </DialogDescription>
          </DialogHeader>
        ) : !state || state.loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="text-accent h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* THE signature moment: the wax seal breaks, the letter lifts. */}
            {!sealBroken && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center"
                initial={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1.5,
                  rotate: reduceMotion ? 0 : -14,
                  y: reduceMotion ? 0 : -14,
                }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
                }
                onAnimationComplete={() => setSealBroken(true)}
              >
                {/* The wax seal itself: embossed "w.", broken on first read. */}
                <span
                  aria-hidden="true"
                  className="bg-accent text-accent-foreground shadow-inner ring-accent-foreground/20 flex size-12 items-center justify-center rounded-full ring-1 ring-inset"
                >
                  <span className="font-serif text-base leading-none font-semibold italic">
                    w
                  </span>
                </span>
              </motion.div>
            )}
            <motion.div
              initial={unsealing && !sealBroken ? { opacity: 0.35, scale: 0.985 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }
              }
            >
              <DialogHeader>
                <p className="text-running-head text-muted-foreground/60">
                  {isDelivered(state.unlockDate, today)
                    ? "opened"
                    : "still sealed"}{" "}
                  · {formatDisplayDate(state.unlockDate, { year: "numeric" })}
                  {note && !isDelivered(state.unlockDate, today)
                    ? ` · ${note.label}`
                    : ""}
                </p>
                <DialogTitle className="font-serif text-2xl leading-tight">
                  {state.title || "An untitled letter"}
                </DialogTitle>
                <DialogDescription>
                  <span className="text-muted-foreground/70 font-hand text-base">
                    in your own hand, kept for this day
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* The letter page: ruled ledger paper, serif prose, drop cap. */}
              <div className="border-border/60 bg-card/60 relative mt-2 overflow-hidden rounded-lg border px-5 py-4 sm:px-6">
                <SlipRules />
                <div className="relative py-2">
                  {state.paragraphs.length === 0 ? (
                    <p className="text-muted-foreground font-serif text-base italic">
                      (This letter is still empty — the words never made it
                      onto the page.)
                    </p>
                  ) : (
                    state.paragraphs.map((paragraph, index) => {
                      if (index === 0 && paragraph.length > 1) {
                        const [first, ...rest] = paragraph;
                        return (
                          <p
                            key={index}
                            className="text-foreground font-serif text-[1.05rem] leading-[1.85]"
                          >
                            <span
                              aria-hidden="true"
                              className="text-accent float-left mr-2 font-serif text-[3.25rem] leading-[0.8] font-bold"
                            >
                              {first}
                            </span>
                            {rest.join("")}
                          </p>
                        );
                      }
                      return (
                        <p
                          key={index}
                          className="text-foreground font-serif text-[1.05rem] leading-[1.85]"
                        >
                          {paragraph}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  {!isDelivered(state.unlockDate, today) && !state.sealed && (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/letters/compose?id=${state.id}` as Route}
                        onClick={onClose}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </Button>
                  )}
                  {!isDelivered(state.unlockDate, today) && state.sealed && (
                    <span className="text-caption text-muted-foreground/60 inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> resting
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete letter"
                    onClick={() => onDelete(state.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="h-9"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
