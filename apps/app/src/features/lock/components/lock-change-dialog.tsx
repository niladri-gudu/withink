"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { cn } from "@withink/utils";
import { Check, Loader2, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { encryptText, exportKeyToHex } from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { safeStorage } from "@/lib/safe-storage";
import { useEncryption } from "@/providers/encryption-provider";

import { saveLockSettingsAction, unlockAction } from "../actions/lock-actions";

interface LockChangeDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ChangeStep = "verify-current" | "new-pin" | "confirm-pin";

/**
 * Change-passcode flow on the Phase-1 Dialog primitive — Radix owns focus
 * trap and Escape (locked while a submission is in flight); the three-step
 * body is byte-equivalent to the former bespoke overlay.
 */
export function LockChangeDialog({
  onClose,
  onSuccess,
}: LockChangeDialogProps) {
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [confirmNewPin, setConfirmNewPin] = React.useState("");
  const [step, setStep] = React.useState<ChangeStep>("verify-current");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const { isClientEncrypted, masterKey, encryptionSalt, unlockWithPin } =
    useEncryption();

  const currentRef = React.useRef<HTMLInputElement>(null);
  const newRef = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLInputElement>(null);

  const [currentFocused, setCurrentFocused] = React.useState(false);
  const [newFocused, setNewFocused] = React.useState(false);
  const [confirmFocused, setConfirmFocused] = React.useState(false);

  // Auto-verify current passcode when 4 digits are typed
  React.useEffect(() => {
    if (currentPin.length === 4 && step === "verify-current") {
      const verifyCurrent = async () => {
        setIsSubmitting(true);

        // Fast path: verify the PIN locally by unwrapping the per-device master
        // key (no network round-trip), then confirm server-side in the background.
        const encryptedMasterKey = isClientEncrypted
          ? safeStorage.getItem("withink_encrypted_master_key")
          : null;
        if (encryptedMasterKey) {
          const decrypted = await unlockWithPin(currentPin, encryptedMasterKey);
          if (decrypted) {
            setStep("new-pin");
            setIsSubmitting(false);
            void unlockAction(currentPin).then((res) => {
              if (!res.success) {
                toast.error(
                  "Passcode is out of sync. Use your Diary Password to unlock.",
                );
              }
            });
            return;
          }
        }

        // Local verification failed — let the server decide.
        const res = await unlockAction(currentPin);
        if (res.success) {
          setStep("new-pin");
        } else {
          setShake(true);
          setCurrentPin("");
          toast.error("Incorrect current passcode");
          setTimeout(() => setShake(false), 500);
        }
        setIsSubmitting(false);
      };
      verifyCurrent();
    }
  }, [currentPin, step, isClientEncrypted, unlockWithPin]);

  const handleNextToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setStep("confirm-pin");
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmNewPin.length !== 4) {
      toast.error("Please confirm your new passcode");
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error("Passcodes do not match. Please start over.");
      setNewPin("");
      setConfirmNewPin("");
      setStep("new-pin");
      return;
    }

    // Don't rotate the passcode if we can't re-bind the master key on this
    // device (the old local key would become unusable and force a password
    // unlock on every lock).
    if (!masterKey || !encryptionSalt) {
      toast.error("Session locked. Please unlock your diary and try again.");
      onClose();
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Updating your passcode…");

    const res = await saveLockSettingsAction({
      isLockEnabled: true,
      passcode: newPin,
      // Rotating a passcode is a privileged transition server-side: prove
      // knowledge of the current one (already verified above).
      currentPasscode: currentPin,
      autoLockTimeout: 300,
      lockOnTabHide: false,
    });

    if (res.success) {
      if (isClientEncrypted && masterKey && encryptionSalt) {
        try {
          const masterKeyHex = await exportKeyToHex(masterKey);
          const pinKey = await deriveKeyFromPasswordAsync(
            newPin,
            encryptionSalt,
            50000,
          );
          const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
          safeStorage.setItem(
            "withink_encrypted_master_key",
            encryptedMasterKey,
          );
          safeStorage.removeItem("withink_master_key");
        } catch (err) {
          console.error(
            "Failed to secure master key with new passcode PIN:",
            err,
          );
        }
      }
      toast.success("Passcode changed successfully!", { id: toastId });
      onSuccess();
    } else {
      toast.error(res.error || "Failed to update passcode", { id: toastId });
    }
    setIsSubmitting(false);
  };

  const blockDismiss = (e: { preventDefault: () => void }) => {
    if (isSubmitting) e.preventDefault();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        size="md"
        onEscapeKeyDown={blockDismiss}
        onPointerDownOutside={blockDismiss}
        onInteractOutside={blockDismiss}
      >
        <DialogHeader>
          <div className="border-accent/20 bg-accent/10 text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-xl border">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl font-semibold">
            Change Passcode
          </DialogTitle>
          <DialogDescription className="text-center">
            Update the secure PIN used to lock your diary.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "verify-current" && (
            <motion.div
              key="verify-current-step"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="w-full space-y-5"
            >
              <div className="space-y-4">
                <label
                  htmlFor="current-pin"
                  className="text-body-small text-foreground block font-medium"
                >
                  Enter current passcode
                </label>
                <motion.div
                  animate={
                    shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}
                  }
                  transition={{ duration: 0.4 }}
                  className="relative flex cursor-text justify-center gap-3 py-1"
                  onClick={() => currentRef.current?.focus()}
                >
                  {Array.from({ length: 4 }, (_, i) => {
                    const char = currentPin[i] || "";
                    const isBoxFocused =
                      currentFocused &&
                      (currentPin.length === i ||
                        (currentPin.length === 4 && i === 3));
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-border bg-background/50 flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold transition-all",
                          isBoxFocused &&
                            "border-accent ring-ring/30 ring-offset-background scale-[1.05] ring-2",
                          char &&
                            "border-accent/40 bg-accent/10 text-foreground",
                        )}
                      >
                        {char ? "●" : ""}
                      </div>
                    );
                  })}
                  <input
                    id="current-pin"
                    ref={currentRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) =>
                      setCurrentPin(e.target.value.replace(/\D/g, ""))
                    }
                    onFocus={() => setCurrentFocused(true)}
                    onBlur={() => setCurrentFocused(false)}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0 select-none"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    disabled={isSubmitting}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === "new-pin" && (
            <motion.form
              key="new-pin-step"
              onSubmit={handleNextToConfirm}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="w-full space-y-5"
            >
              <div className="space-y-4">
                <label
                  htmlFor="new-pin-input"
                  className="text-body-small text-foreground block font-medium"
                >
                  Enter new 4-digit passcode
                </label>
                <div
                  className="relative flex cursor-text justify-center gap-3 py-1"
                  onClick={() => newRef.current?.focus()}
                >
                  {Array.from({ length: 4 }, (_, i) => {
                    const char = newPin[i] || "";
                    const isBoxFocused =
                      newFocused &&
                      (newPin.length === i || (newPin.length === 4 && i === 3));
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-border bg-background/50 flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold transition-all",
                          isBoxFocused &&
                            "border-accent ring-ring/30 ring-offset-background scale-[1.05] ring-2",
                          char &&
                            "border-accent/40 bg-accent/10 text-foreground",
                        )}
                      >
                        {char ? "●" : ""}
                      </div>
                    );
                  })}
                  <input
                    id="new-pin-input"
                    ref={newRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, ""))
                    }
                    onFocus={() => setNewFocused(true)}
                    onBlur={() => setNewFocused(false)}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0 select-none"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={newPin.length !== 4}
                  className="px-6"
                >
                  Continue
                </Button>
              </div>
            </motion.form>
          )}

          {step === "confirm-pin" && (
            <motion.form
              key="confirm-pin-step"
              onSubmit={handleUpdateSubmit}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="w-full space-y-5"
            >
              <div className="space-y-4">
                <label
                  htmlFor="confirm-pin-input"
                  className="text-body-small text-foreground block font-medium"
                >
                  Confirm new passcode
                </label>
                <div
                  className="relative flex cursor-text justify-center gap-3 py-1"
                  onClick={() => confirmRef.current?.focus()}
                >
                  {Array.from({ length: 4 }, (_, i) => {
                    const char = confirmNewPin[i] || "";
                    const isBoxFocused =
                      confirmFocused &&
                      (confirmNewPin.length === i ||
                        (confirmNewPin.length === 4 && i === 3));
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-border bg-background/50 flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold transition-all",
                          isBoxFocused &&
                            "border-accent ring-ring/30 ring-offset-background scale-[1.05] ring-2",
                          char &&
                            "border-accent/40 bg-accent/10 text-foreground",
                        )}
                      >
                        {char ? "●" : ""}
                      </div>
                    );
                  })}
                  <input
                    id="confirm-pin-input"
                    ref={confirmRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmNewPin}
                    onChange={(e) =>
                      setConfirmNewPin(e.target.value.replace(/\D/g, ""))
                    }
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0 select-none"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setConfirmNewPin("");
                    setStep("new-pin");
                  }}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={confirmNewPin.length !== 4 || isSubmitting}
                  className="w-full gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm &amp; Update
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
