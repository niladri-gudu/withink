"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Input } from "@withink/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  deriveUnlockProofHex,
  encryptText,
  exportKeyToHex,
  generateMasterKey,
  generateRandomSalt,
} from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { safeStorage } from "@/lib/safe-storage";
import { useEncryption } from "@/providers/encryption-provider";
import {
  enableClientEncryptionAction,
  getPlaintextEntriesForMigrationAction,
} from "@/features/encryption/actions/encryption-actions";

interface ZkSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether this account has the Diary Lock enabled (with a bound PIN). */
  diaryLockEnabled: boolean;
  diaryHasPasscode: boolean;
}

/**
 * Zero-knowledge enablement ("Migrate Journal") on the Phase-1 Dialog
 * primitive. Owns its form state; Radix owns focus trap/Escape — dismissal is
 * locked while the one-way migration is in flight.
 */
export function ZkSetupDialog({
  open,
  onOpenChange,
  diaryLockEnabled,
  diaryHasPasscode,
}: ZkSetupDialogProps) {
  const { setEncryptionSettings, setMasterKey } = useEncryption();
  const [zkPassword, setZkPassword] = React.useState("");
  const [zkPasswordConfirm, setZkPasswordConfirm] = React.useState("");
  const [zkPINConfirm, setZkPINConfirm] = React.useState("");
  const [zkWarningChecked, setZkWarningChecked] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);

  const resetForm = () => {
    setZkPassword("");
    setZkPasswordConfirm("");
    setZkPINConfirm("");
    setZkWarningChecked(false);
  };

  const handleMigrate = async () => {
    if (zkPassword !== zkPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!zkWarningChecked) {
      toast.error("Please confirm the data recovery warning");
      return;
    }
    if (diaryLockEnabled && diaryHasPasscode && !zkPINConfirm) {
      toast.error("Please enter your current 4-digit PIN");
      return;
    }

    setIsMigrating(true);
    const toastId = toast.loading("Starting zero-knowledge migration...");

    try {
      // 1. Fetch plaintext entries from the server
      toast.loading("Fetching journal entries...", { id: toastId });
      const fetchRes = await getPlaintextEntriesForMigrationAction();
      if (!fetchRes.success || !fetchRes.entries) {
        throw new Error(fetchRes.error || "Failed to fetch entries");
      }

      const entries = fetchRes.entries;

      // 2. Generate random 16-byte salt and derive password key client-side
      toast.loading("Deriving encryption keys...", { id: toastId });
      const salt = generateRandomSalt();
      const passwordKey = await deriveKeyFromPasswordAsync(zkPassword, salt);

      // 3. Generate a secure random master key client-side
      const newMasterKey = await generateMasterKey();
      const masterKeyHex = await exportKeyToHex(newMasterKey);

      // 4. Encrypt the master key with the password key
      const verificationCiphertext = await encryptText(
        masterKeyHex,
        passwordKey,
      );

      // 5. Encrypt all entry texts client-side
      toast.loading(`Encrypting ${entries.length} entries...`, { id: toastId });
      const encryptedEntries = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;

        // Encrypt fields using the master key
        const titleEnc = await encryptText(entry.title || "", newMasterKey);
        const contentHtmlEnc = await encryptText(
          entry.contentHtml,
          newMasterKey,
        );
        const contentTextEnc = await encryptText(
          entry.contentText,
          newMasterKey,
        );
        const contentJsonEnc = await encryptText(
          JSON.stringify(entry.contentJson),
          newMasterKey,
        );

        // Count words
        const wordCount = entry.contentText.split(/\s+/).filter(Boolean).length;

        encryptedEntries.push({
          id: entry.id,
          title: titleEnc,
          contentHtml: contentHtmlEnc,
          contentText: contentTextEnc,
          contentJson: contentJsonEnc,
          wordCount,
        });
      }

      // 6. Submit to the server. Bind the unlock proof so the lock's unlock
      // cookie can only be minted with possession of this master key.
      toast.loading("Saving secure database records...", { id: toastId });
      const unlockProof = await deriveUnlockProofHex(newMasterKey);
      const enableRes = await enableClientEncryptionAction(
        salt,
        verificationCiphertext,
        encryptedEntries,
        unlockProof,
      );
      if (!enableRes.success) {
        throw new Error(
          enableRes.error || "Failed to enable client encryption",
        );
      }

      // 7. If PIN lock is enabled, encrypt the master key with the PIN key
      if (diaryLockEnabled && diaryHasPasscode && zkPINConfirm) {
        const pinKey = await deriveKeyFromPasswordAsync(
          zkPINConfirm,
          salt,
          50000,
        );
        const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
        safeStorage.setItem("withink_encrypted_master_key", encryptedMasterKey);
      } else {
        safeStorage.removeItem("withink_encrypted_master_key");
      }

      // Plaintext key caching is removed.
      safeStorage.removeItem("withink_master_key");
      safeStorage.removeSessionItem("withink_master_key");

      // 8. Update local context
      setEncryptionSettings({
        isClientEncrypted: true,
        encryptionSalt: salt,
        verificationCiphertext,
      });
      setMasterKey(newMasterKey);

      toast.success("Diary Zero-Knowledge Encryption activated!", {
        id: toastId,
      });
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to migrate to zero-knowledge";
      toast.error(message, { id: toastId });
    } finally {
      setIsMigrating(false);
    }
  };

  const blockDismiss = (e: { preventDefault: () => void }) => {
    if (isMigrating) e.preventDefault();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isMigrating) return;
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
            Set up Diary Password
          </DialogTitle>
          <DialogDescription>
            Establish a client-side decryption password. Your entries will be
            decrypted/encrypted locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="zk-setup-password"
              className="text-body-small text-foreground font-medium"
            >
              Diary Password
            </label>
            <Input
              id="zk-setup-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={zkPassword}
              onChange={(e) => setZkPassword(e.target.value)}
              disabled={isMigrating}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="zk-setup-password-confirm"
              className="text-body-small text-foreground font-medium"
            >
              Confirm Password
            </label>
            <Input
              id="zk-setup-password-confirm"
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={zkPasswordConfirm}
              onChange={(e) => setZkPasswordConfirm(e.target.value)}
              disabled={isMigrating}
            />
          </div>

          {diaryLockEnabled && diaryHasPasscode && (
            <div className="space-y-2">
              <label
                htmlFor="zk-setup-pin"
                className="text-body-small text-foreground font-medium"
              >
                Confirm 4-digit PIN
              </label>
              <Input
                id="zk-setup-pin"
                type="password"
                maxLength={4}
                inputMode="numeric"
                placeholder="Enter PIN passcode"
                autoComplete="one-time-code"
                value={zkPINConfirm}
                onChange={(e) =>
                  setZkPINConfirm(e.target.value.replace(/\D/g, ""))
                }
                disabled={isMigrating}
              />
              <p className="text-muted-foreground text-[10px]">
                Required to secure your local browser key with your passcode
                lock.
              </p>
            </div>
          )}

          <div className="border-accent/25 bg-accent/5 mt-2 flex items-start gap-2.5 rounded-xl border p-4">
            <input
              type="checkbox"
              id="zk-warning"
              checked={zkWarningChecked}
              onChange={(e) => setZkWarningChecked(e.target.checked)}
              disabled={isMigrating}
              className="border-border text-accent focus:ring-accent mt-0.5 h-4 w-4 rounded"
            />
            <label
              htmlFor="zk-warning"
              className="text-muted-foreground cursor-pointer select-none text-[11px] leading-relaxed"
            >
              I understand my journal is 100% zero-knowledge. If I lose my Diary
              Password, my data cannot be recovered by anyone.
            </label>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMigrating}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleMigrate()}
            disabled={
              isMigrating ||
              !zkPassword ||
              !zkPasswordConfirm ||
              !zkWarningChecked ||
              (diaryLockEnabled && diaryHasPasscode && !zkPINConfirm)
            }
          >
            {isMigrating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Migrating
              </>
            ) : (
              "Migrate Journal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
