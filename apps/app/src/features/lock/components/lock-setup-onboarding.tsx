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
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { encryptText, exportKeyToHex } from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { safeStorage } from "@/lib/safe-storage";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";
import { GateLayout } from "@/components/gate-layout";

import { saveLockSettingsAction } from "../actions/lock-actions";

interface LockSetupOnboardingProps {
  pin?: string;
  onSetupSuccess: (
    masterKeyHex?: string,
    salt?: string,
    verificationCiphertext?: string,
    pin?: string,
  ) => void;
  /** Called when binding cannot complete (e.g. the master key was cleared mid-setup). */
  onCancel?: () => void;
  /**
   * "gate" (default): fullscreen GateLayout screen used by the app shell's
   * first-launch prompt. "dialog": centered Phase-1 Dialog used by Settings —
   * same two-step body, Radix owns focus trap/Escape.
   */
  variant?: "gate" | "dialog";
}

export function LockSetupOnboarding({
  pin: prefilledPin,
  onSetupSuccess,
  onCancel,
  variant = "gate",
}: LockSetupOnboardingProps) {
  const [pin, setPin] = React.useState(prefilledPin || "");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [step, setStep] = React.useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { masterKey, encryptionSalt, getUnlockProof } = useEncryption();

  const onboardingContainerRef = useFocusTrap(true);

  const inputRef1 = React.useRef<HTMLInputElement>(null);
  const inputRef2 = React.useRef<HTMLInputElement>(null);
  const [isFocused1, setIsFocused1] = React.useState(false);
  const [isFocused2, setIsFocused2] = React.useState(false);

  const handlePinChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (numeric.length <= 4) {
      setPin(numeric);
    }
  };

  const handleConfirmPinChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (numeric.length <= 4) {
      setConfirmPin(numeric);
    }
  };

  const goToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPin.length !== 4) {
      toast.error("Confirm PIN must be exactly 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match. Please start over.");
      setPin("");
      setConfirmPin("");
      setStep(1);
      return;
    }

    // The master key must be in memory to bind it to this device with the PIN.
    // If it was cleared (e.g. an auto-lock/tab lock fired mid-setup), we must
    // not save a passcode that this device can't actually use — route the user
    // back through the Diary Password unlock instead.
    if (!masterKey || !encryptionSalt) {
      toast.error("Session locked. Please unlock your diary and try again.");
      onCancel?.();
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Securing your diary…");

    // Attach the unlock proof when the master key is available: it binds the
    // proof on first-time setup and satisfies the server's privileged-
    // transition check when an account passcode already exists (fresh device).
    const unlockProof = await getUnlockProof();

    // Bind THIS DEVICE first: encrypt the in-memory master key with the PIN.
    // If this fails we abort before touching the server — saving a server-side
    // passcode without a device-bound key strands the user on the Diary
    // Password screen on every unlock (the exact bug this replaces). Nothing
    // is persisted until both steps can succeed.
    let encryptedMasterKey: string;
    try {
      const masterKeyHex = await exportKeyToHex(masterKey);
      const pinKey = await deriveKeyFromPasswordAsync(
        pin,
        encryptionSalt,
        50000,
      );
      encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
    } catch (err) {
      console.error("Failed to bind the passcode to this device:", err);
      toast.error("Couldn't secure this device. Please try again.", {
        id: toastId,
      });
      setIsSubmitting(false);
      return;
    }

    const res = await saveLockSettingsAction({
      isLockEnabled: true,
      passcode: pin,
      ...(unlockProof ? { unlockProof } : {}),
      autoLockTimeout: 300, // 5 minutes default
      lockOnTabHide: false,
    });

    if (res.success) {
      safeStorage.setItem("withink_encrypted_master_key", encryptedMasterKey);
      safeStorage.removeItem("withink_master_key");
      toast.success("Diary passcode configured successfully!", {
        id: toastId,
      });
      onSetupSuccess("", "", "", pin);
    } else {
      toast.error(res.error || "Failed to set passcode", { id: toastId });
    }
    setIsSubmitting(false);
  };

  const steps = (
    <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.form
          key="step1"
          onSubmit={goToConfirm}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="w-full space-y-5"
        >
          <div className="space-y-4">
            <label
              htmlFor="setup-pin"
              className="text-body-small text-foreground block font-medium"
            >
              Enter a 4-digit passcode
            </label>
            <div
              className="relative flex cursor-text justify-center gap-3 py-1"
              onClick={() => inputRef1.current?.focus()}
            >
              {Array.from({ length: 4 }, (_, i) => {
                const char = pin[i] || "";
                const isBoxFocused =
                  isFocused1 &&
                  (pin.length === i || (pin.length === 4 && i === 3));
                return (
                  <div
                    key={i}
                    className={cn(
                      "border-border bg-background/50 flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold transition-all",
                      isBoxFocused &&
                        "border-accent ring-ring/30 ring-offset-background scale-[1.05] ring-2",
                      char && "border-accent/40 bg-accent/10 text-foreground",
                    )}
                  >
                    {char ? "●" : ""}
                  </div>
                );
              })}
              <input
                id="setup-pin"
                ref={inputRef1}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                className="absolute inset-0 h-full w-full cursor-text opacity-0 select-none"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={pin.length !== 4} className="px-6">
              Continue
            </Button>
          </div>
        </motion.form>
      )}

      {step === 2 && (
        <motion.form
          key="step2"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="w-full space-y-5"
        >
          <div className="space-y-4">
            <label
              htmlFor="confirm-pin"
              className="text-body-small text-foreground block font-medium"
            >
              Confirm your passcode
            </label>
            <div
              className="relative flex cursor-text justify-center gap-3 py-1"
              onClick={() => inputRef2.current?.focus()}
            >
              {Array.from({ length: 4 }, (_, i) => {
                const char = confirmPin[i] || "";
                const isBoxFocused =
                  isFocused2 &&
                  (confirmPin.length === i ||
                    (confirmPin.length === 4 && i === 3));
                return (
                  <div
                    key={i}
                    className={cn(
                      "border-border bg-background/50 flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold transition-all",
                      isBoxFocused &&
                        "border-accent ring-ring/30 ring-offset-background scale-[1.05] ring-2",
                      char && "border-accent/40 bg-accent/10 text-foreground",
                    )}
                  >
                    {char ? "●" : ""}
                  </div>
                );
              })}
              <input
                id="confirm-pin"
                ref={inputRef2}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                onFocus={() => setIsFocused2(true)}
                onBlur={() => setIsFocused2(false)}
                className="absolute inset-0 h-full w-full cursor-text opacity-0 select-none"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConfirmPin("");
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={confirmPin.length !== 4 || isSubmitting}
              className="w-full gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Set Passcode
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );

  if (variant === "dialog") {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !isSubmitting) onCancel?.();
        }}
      >
        <DialogContent
          size="sm"
          onEscapeKeyDown={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">
              Secure Your Diary
            </DialogTitle>
            <DialogDescription>
              Protect your diary entries from local access when you switch tabs
              or leave your screen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex w-full flex-col items-center text-center">
            {steps}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <GateLayout containerRef={onboardingContainerRef}>
      <div className="flex w-full flex-col items-center text-center">
        <div className="space-y-1.5 text-center sm:text-left">
          <h1 className="text-h2 text-foreground font-serif font-bold">
            Secure Your Diary
          </h1>
          <p className="text-running-head text-muted-foreground">
            Protect your private pages
          </p>
        </div>
        <p className="text-body-small text-muted-foreground mt-2 mb-6 max-w-sm">
          Protect your diary entries from local access when you switch tabs or
          leave your screen.
        </p>

        {steps}

        {/* Optional by design: skipping is permanent (the hint never
            re-appears) and the passcode can be enabled later in Settings. */}
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => onCancel?.()}
          className="text-muted-foreground/70 hover:text-foreground mt-2 text-xs tracking-wide"
        >
          Maybe later
        </Button>
      </div>
    </GateLayout>
  );
}
