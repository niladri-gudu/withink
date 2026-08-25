"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Input } from "@withink/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { decryptText, encryptText } from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { useEncryption } from "@/providers/encryption-provider";
import { updateDiaryPasswordAction } from "@/features/encryption/actions/encryption-actions";

interface ZkChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diary Password rotation on the Phase-1 Dialog primitive. Owns its form
 * state; Radix owns focus trap/Escape — dismissal is locked while the
 * re-encryption round-trip is in flight.
 */
export function ZkChangeDialog({ open, onOpenChange }: ZkChangeDialogProps) {
  const {
    encryptionSalt,
    verificationCiphertext,
    setEncryptionSettings,
    clearLocalMasterKey,
  } = useEncryption();
  const [zkOldPassword, setZkOldPassword] = React.useState("");
  const [zkNewPassword, setZkNewPassword] = React.useState("");
  const [zkNewPasswordConfirm, setZkNewPasswordConfirm] = React.useState("");
  const [isChanging, setIsChanging] = React.useState(false);

  const handleChange = async () => {
    if (zkNewPassword !== zkNewPasswordConfirm) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChanging(true);
    const toastId = toast.loading("Updating Diary Password...");

    try {
      // 1. Derive key from old password
      const oldPasswordKey = await deriveKeyFromPasswordAsync(
        zkOldPassword,
        encryptionSalt,
      );

      // 2. Decrypt verificationCiphertext to get master key hex
      let masterKeyHex: string;
      try {
        masterKeyHex = await decryptText(
          verificationCiphertext,
          oldPasswordKey,
        );
      } catch {
        throw new Error("Incorrect current Diary Password");
      }

      // 3. Derive key from new password using the same salt
      const newPasswordKey = await deriveKeyFromPasswordAsync(
        zkNewPassword,
        encryptionSalt,
      );

      // 4. Encrypt master key hex with new password key
      const newVerificationCiphertext = await encryptText(
        masterKeyHex,
        newPasswordKey,
      );

      // 5. Update server
      const res = await updateDiaryPasswordAction(newVerificationCiphertext);
      if (!res.success) {
        throw new Error(res.error || "Failed to update settings on server");
      }

      // 6. Update local context; other devices must re-auth with the new password
      setEncryptionSettings({
        isClientEncrypted: true,
        encryptionSalt,
        verificationCiphertext: newVerificationCiphertext,
      });
      clearLocalMasterKey();

      toast.success("Diary Password updated successfully!", { id: toastId });
      onOpenChange(false);
      setZkOldPassword("");
      setZkNewPassword("");
      setZkNewPasswordConfirm("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      toast.error(message, { id: toastId });
    } finally {
      setIsChanging(false);
    }
  };

  const blockDismiss = (e: { preventDefault: () => void }) => {
    if (isChanging) e.preventDefault();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isChanging) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="sm"
        onEscapeKeyDown={blockDismiss}
        onPointerDownOutside={blockDismiss}
        onInteractOutside={blockDismiss}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Change Diary Password
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="zk-current-password"
              className="text-body-small text-foreground font-medium"
            >
              Current Diary Password
            </label>
            <Input
              id="zk-current-password"
              type="password"
              placeholder="Enter current password"
              autoComplete="current-password"
              value={zkOldPassword}
              onChange={(e) => setZkOldPassword(e.target.value)}
              disabled={isChanging}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="zk-new-password"
              className="text-body-small text-foreground font-medium"
            >
              New Diary Password
            </label>
            <Input
              id="zk-new-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={zkNewPassword}
              onChange={(e) => setZkNewPassword(e.target.value)}
              disabled={isChanging}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="zk-new-password-confirm"
              className="text-body-small text-foreground font-medium"
            >
              Confirm New Password
            </label>
            <Input
              id="zk-new-password-confirm"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={zkNewPasswordConfirm}
              onChange={(e) => setZkNewPasswordConfirm(e.target.value)}
              disabled={isChanging}
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isChanging}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleChange()}
            disabled={
              isChanging ||
              !zkOldPassword ||
              !zkNewPassword ||
              !zkNewPasswordConfirm
            }
          >
            {isChanging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
