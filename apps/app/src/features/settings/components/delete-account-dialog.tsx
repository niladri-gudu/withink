"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@withink/ui/dialog";
import { Input } from "@withink/ui/input";
import { cn } from "@withink/utils";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { authClient, clearSessionCookies } from "@/lib/auth-client";
import { clearSwCaches } from "@/lib/sw-cache";

import { deleteAccountAction } from "../actions/settings-actions";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Credential accounts must re-enter their password (server-enforced). */
  hasCredentialAccount: boolean;
}

/**
 * Account-deletion confirmation on the Phase-1 Dialog primitive. Owns the
 * type-DELETE + password confirmation state; Radix owns focus trap/Escape —
 * dismissal is locked while deletion runs.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  hasCredentialAccount,
}: DeleteAccountDialogProps) {
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deletePassword, setDeletePassword] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    // Credential accounts must re-enter their password (server-enforced);
    // OAuth-only accounts have no password and skip this.
    if (hasCredentialAccount && !deletePassword.trim()) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Deconstructing your diary...");

    try {
      const res = await deleteAccountAction(
        hasCredentialAccount ? deletePassword : undefined,
      );
      if (!res.success) {
        throw new Error(res.error || "Failed to delete account");
      }

      toast.success("Diary dissolved successfully", { id: toastId });
      await clearSwCaches();
      clearSessionCookies();
      await authClient.signOut();
      window.location.href = "/login";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message, { id: toastId });
      setIsDeleting(false);
    }
  };

  const blockDismiss = (e: { preventDefault: () => void }) => {
    if (isDeleting) e.preventDefault();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isDeleting) return;
        onOpenChange(next);
        if (!next) {
          setDeleteConfirmText("");
          setDeletePassword("");
        }
      }}
    >
      <DialogContent
        size="sm"
        onEscapeKeyDown={blockDismiss}
        onPointerDownOutside={blockDismiss}
        onInteractOutside={blockDismiss}
      >
        <div className="space-y-3 text-center">
          <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-h3 text-foreground">
            Delete your account?
          </DialogTitle>
          <DialogDescription className="text-body-small text-muted-foreground">
            This permanently erases every entry and memory. To confirm, type{" "}
            <span className="text-foreground font-semibold">DELETE</span> below.
          </DialogDescription>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Type DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            className="text-center tracking-widest"
          />
          {hasCredentialAccount && (
            <Input
              type="password"
              placeholder="Confirm your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              autoComplete="current-password"
            />
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting || deleteConfirmText !== "DELETE"}
              className={cn("flex-1 gap-2")}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
