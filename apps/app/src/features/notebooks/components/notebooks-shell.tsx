"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Card } from "@withink/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { IconButton } from "@withink/ui/icon-button";
import { Input } from "@withink/ui/input";
import { cn } from "@withink/utils";
import { Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { formatDisplayDate } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import type { ResolvedPlan } from "@/features/billing/config/plans";

import {
  createNotebookAction,
  deleteNotebookAction,
  listNotebooksAction,
  renameNotebookAction,
  setDefaultNotebookAction,
} from "../actions/notebook-actions";
import type { NotebookSummary } from "../services/notebook-service";
import { notebookNameSchema } from "../validation/notebook-schema";

interface NotebooksShellProps {
  initialNotebooks: NotebookSummary[];
  /** The viewer's plan notebook cap (1 / 3 / 10). */
  limit: number;
  plan: ResolvedPlan;
}

type NameFormValues = { name: string };

// zodResolver needs an object schema; the field reuses the canonical name rule.
const nameFormSchema = z.object({ name: notebookNameSchema });

function toIsoDay(iso: string): string {
  return iso.slice(0, 10);
}

export function NotebooksShell({
  initialNotebooks,
  limit,
  plan,
}: NotebooksShellProps) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<NotebookSummary | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<NotebookSummary | null>(
    null,
  );
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const atLimit = notebooks.length >= limit;

  // Whole-card navigation: the shelf is a table of contents — tapping a
  // notebook opens its timeline. Buttons inside stop propagation.
  const openNotebook = (notebookId: string) => {
    router.push(
      `${ROUTES.APP.ENTRIES}?notebook=${notebookId}` as Parameters<
        typeof router.push
      >[0],
    );
  };

  const refresh = () => {
    startTransition(async () => {
      const res = await listNotebooksAction();
      if (res.success && res.data) {
        setNotebooks(res.data);
      }
    });
  };

  // Option A (locked): the New Notebook control stays visible and tappable
  // at the limit — tapping opens the paywall (Free/Plus) or the calm
  // informational dialog (Pro at the hard cap of ten).
  const handleNewClick = () => {
    if (!atLimit) {
      setCreateOpen(true);
      return;
    }
    if (plan === "pro") {
      setPaywallOpen(true); // renders as the informational cap dialog
      return;
    }
    setPaywallOpen(true);
  };

  const handleSetDefault = (target: NotebookSummary) => {
    setBusy(true);
    startTransition(async () => {
      const res = await setDefaultNotebookAction(target.id);
      setBusy(false);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't update the default notebook.");
        return;
      }
      toast.success(`New pages now land in “${target.name}”.`);
      refresh();
    });
  };

  return (
    <div className="w-full space-y-8">
      <header>
        <div className="border-border/70 flex items-baseline justify-between gap-4 border-b pb-3">
          <span className="text-running-head text-muted-foreground/70">
            Notebooks
          </span>
          <span className="text-caption text-muted-foreground/50 tabular-nums">
            {notebooks.length} of{" "}
            {limit === Number.POSITIVE_INFINITY ? "∞" : limit}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground/70 font-hand text-lg leading-snug">
              every journal, kept in its place
            </p>
            <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
              Your{" "}
              <span className="text-accent font-normal">shelf</span>
            </h1>
            <p className="text-body-small text-muted-foreground mt-1">
              Each day&apos;s reflection is filed into one notebook. Reading and
              writing stay unlimited everywhere.
            </p>
          </div>
          <div className="shrink-0">
            <Button onClick={handleNewClick} disabled={pending}>
              New notebook
            </Button>
          </div>
        </div>
      </header>

      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy={pending}
      >
        {notebooks.map((notebook, index) => (
          <li key={notebook.id}>
            <Card
              interactive
              role="link"
              tabIndex={0}
              aria-label={`Open ${notebook.name} entries`}
              onClick={() => openNotebook(notebook.id)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openNotebook(notebook.id);
                }
              }}
              className="focus-visible:ring-ring relative h-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {/* The open-folio tick: the rail's gold language marking the
                  notebook where new pages land. An element, not a border. */}
              {notebook.isDefault && (
                <span
                  aria-hidden="true"
                  className="bg-accent absolute top-6 bottom-6 left-0 w-[3px] rounded-r-full"
                />
              )}

              <div className="flex h-full flex-col p-6">
                {/* Folio line: shelf numeral ruled across like the codex index */}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-running-head",
                      notebook.isDefault
                        ? "text-accent"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="border-border/60 flex-1 border-t border-dashed"
                  />
                </div>

                <h2 className="text-foreground mt-3 font-serif text-2xl leading-snug font-semibold break-words">
                  {notebook.name}
                </h2>

                <p className="text-running-head text-muted-foreground/70 mt-1.5">
                  {notebook.entryCount === 1
                    ? "1 entry"
                    : `${notebook.entryCount} entries`}
                  {notebook.lastWrittenAt
                    ? ` · ${formatDisplayDate(
                        toIsoDay(notebook.lastWrittenAt),
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}`
                    : ""}
                </p>

                {notebook.isDefault && (
                  <p className="text-accent font-hand mt-1 text-lg leading-snug">
                    new pages land here
                  </p>
                )}

                {/* The blank page: faint ruled lines waiting for ink */}
                <div className="mt-auto space-y-2.5 pt-6" aria-hidden="true">
                  <div className="border-border/80 border-t" />
                  <div className="border-border/50 border-t" />
                  <div className="border-border/30 border-t" />
                </div>

                <div className="border-border/60 mt-4 flex flex-wrap items-center gap-y-1 border-t pt-2">
                  {!notebook.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(notebook);
                      }}
                    >
                      Make default
                    </Button>
                  )}
                  <span className="flex-1" />
                  <IconButton
                    variant="ghost"
                    aria-label={`Rename ${notebook.name}`}
                    title="Rename"
                    className="text-muted-foreground/70 hover:text-foreground"
                    disabled={pending || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameTarget(notebook);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    aria-label={`Delete ${notebook.name}`}
                    title="Delete"
                    className="text-muted-foreground/70 hover:text-destructive"
                    disabled={pending || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(notebook);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <NameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="A fresh notebook"
        description="Give it a name — a place for dreams, work, gratitude, whatever deserves its own spine."
        submitLabel="Create"
        pending={pending}
        onSubmit={(name) => {
          startTransition(async () => {
            const res = await createNotebookAction(name);
            if (!res.success) {
              if (res.code === "NOTEBOOK_LIMIT_REACHED") {
                setCreateOpen(false);
                setPaywallOpen(true);
                return;
              }
              toast.error(res.error ?? "Couldn't create that notebook.");
              return;
            }
            setCreateOpen(false);
            toast.success(`“${res.data?.name}” is on your shelf.`);
            refresh();
          });
        }}
      />

      <NameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title={`Rename “${renameTarget?.name ?? ""}”`}
        description="The spine label changes; everything filed inside stays put."
        submitLabel="Rename"
        pending={pending}
        initialValue={renameTarget?.name ?? ""}
        onSubmit={(name) => {
          const target = renameTarget;
          if (!target) return;
          startTransition(async () => {
            const res = await renameNotebookAction(target.id, name);
            if (!res.success) {
              toast.error(res.error ?? "Couldn't rename that notebook.");
              return;
            }
            setRenameTarget(null);
            toast.success("Renamed.");
            refresh();
          });
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete “${deleteTarget?.name ?? ""}”?`}
        description="Only an empty notebook can be removed — move its entries first. Nothing you've written is ever deleted with the shelf."
        confirmLabel="Delete notebook"
        pending={pending}
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          startTransition(async () => {
            const res = await deleteNotebookAction(target.id);
            if (!res.success) {
              toast.error(res.error ?? "Couldn't delete that notebook.");
              setDeleteTarget(null);
              return;
            }
            setDeleteTarget(null);
            toast.success("The shelf has room again.");
            refresh();
          });
        }}
      />

      <UpgradeDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason="notebooks"
        plan={plan}
      />
    </div>
  );
}

interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initialValue?: string;
  pending: boolean;
  onSubmit: (name: string) => void;
}

/** Single-field create/rename form (react-hook-form + zod, per convention). */
function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initialValue = "",
  pending,
  onSubmit,
}: NameDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: initialValue },
  });

  // Re-seed the field each time the dialog opens for a different target.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = `${title}:${initialValue}`;
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey);
    reset({ name: initialValue });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => onSubmit(values.name))}
        >
          <div className="space-y-1.5">
            <Input
              {...register("name")}
              placeholder="Notebook name"
              maxLength={60}
              autoFocus
              aria-label="Notebook name"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-caption">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
