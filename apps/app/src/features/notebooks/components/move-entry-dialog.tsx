"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Select } from "@withink/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { moveEntryToNotebookAction } from "../actions/notebook-actions";

interface MoveEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The entry's date (entries are date-keyed). */
  date: string;
  /** The viewer's notebooks (id + name). */
  notebooks: { id: string; name: string }[];
  /** The entry's current filing, preselected in the list. */
  currentNotebookId?: string | null;
  /**
   * Called after a successful move with the new notebook id — callers update
   * local state and/or trigger a background sync from here.
   */
  onMoved?: (notebookId: string) => void;
}

/**
 * The ONE move-to-notebook dialog (editor header chip and the timeline's
 * move button both render this). Re-filing is an explicit server action —
 * autosave never moves an existing entry between notebooks.
 */
export function MoveEntryDialog({
  open,
  onOpenChange,
  date,
  notebooks,
  currentNotebookId,
  onMoved,
}: MoveEntryDialogProps) {
  const queryClient = useQueryClient();
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Derived preselection: a fresh open always starts from the entry's current
  // notebook (pickedTarget resets on close), so no state-sync effect needed.
  const handleOpenChange = (next: boolean) => {
    if (!next) setPickedTarget(null);
    onOpenChange(next);
  };
  const moveTarget =
    pickedTarget ?? currentNotebookId ?? notebooks[0]?.id ?? "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>File this page where?</DialogTitle>
          <DialogDescription>
            The entry keeps its words and date; only its shelf changes.
          </DialogDescription>
        </DialogHeader>

        <Select
          value={moveTarget}
          onChange={(e) => setPickedTarget(e.target.value)}
          aria-label="Notebook"
          className="w-full"
        >
          {notebooks.map((notebook) => (
            <option key={notebook.id} value={notebook.id}>
              {notebook.name}
            </option>
          ))}
        </Select>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={moving}
          >
            Cancel
          </Button>
          <Button
            disabled={moving || !moveTarget || moveTarget === currentNotebookId}
            onClick={() => {
              setMoving(true);
              void (async () => {
                const res = await moveEntryToNotebookAction(date, moveTarget);
                setMoving(false);
                if (!res.success) {
                  toast.error(res.error ?? "Couldn't move that entry.");
                  return;
                }
                handleOpenChange(false);
                queryClient.invalidateQueries({ queryKey: ["entries"] });
                toast.success("Filed.");
                onMoved?.(moveTarget);
              })();
            }}
          >
            {moving && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
