"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { cn } from "@withink/utils";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { encryptText, exportKeyToHex } from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";

import { saveLockSettingsAction } from "../actions/lock-actions";

interface LockSetupOnboardingProps {
  pin?: string;
  onSetupSuccess: (
    masterKeyHex?: string,
    salt?: string,
    verificationCiphertext?: string,
    pin?: string,
  ) => void;
}

export function LockSetupOnboarding({
  pin: prefilledPin,
  onSetupSuccess,
}: LockSetupOnboardingProps) {
  const [pin, setPin] = React.useState(prefilledPin || "");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [step, setStep] = React.useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { isClientEncrypted, masterKey, encryptionSalt } = useEncryption();

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

    setIsSubmitting(true);
    const toastId = toast.loading("Securing your sanctuary…");

    const res = await saveLockSettingsAction({
      isLockEnabled: true,
      passcode: pin,
      autoLockTimeout: 300, // 5 minutes default
      lockOnTabHide: true,
    });

    if (res.success) {
      if (isClientEncrypted && masterKey && encryptionSalt) {
        try {
          const masterKeyHex = await exportKeyToHex(masterKey);
          const pinKey = await deriveKeyFromPasswordAsync(
            pin,
            encryptionSalt,
            50000,
          );
          const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
          localStorage.setItem(
            "withink_encrypted_master_key",
            encryptedMasterKey,
          );
          localStorage.removeItem("withink_master_key");
        } catch (err) {
          console.error("Failed to secure master key with passcode PIN:", err);
        }
      }
      toast.success("Sanctuary passcode configured successfully!", {
        id: toastId,
      });
      onSetupSuccess("", "", "", pin);
    } else {
      toast.error(res.error || "Failed to set passcode", { id: toastId });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-background/80 animate-in fade-in fixed inset-0 z-[9990] flex items-center justify-center backdrop-blur-sm duration-200">
      <motion.div
        ref={onboardingContainerRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="border-border bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          {/* Logo / Header */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-foreground mb-2 font-serif text-3xl font-bold tracking-tight">
              withink.
            </span>
            <div className="text-muted-foreground bg-secondary/80 border-border flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
              <ShieldAlert className="text-accent h-3.5 w-3.5" />
              <span>Sanctuary Security</span>
            </div>
          </div>

          <h2 className="text-foreground mt-2 mb-2 font-serif text-2xl font-semibold">
            Secure Your Sanctuary
          </h2>
          <p className="text-body-small text-muted-foreground mb-6 max-w-sm">
            Protect your diary entries from local access when you switch tabs or
            leave your screen.
          </p>

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
                            char &&
                              "border-accent/40 bg-accent/10 text-foreground",
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
                  <Button
                    type="submit"
                    disabled={pin.length !== 4}
                    className="rounded-full px-6"
                  >
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
                            char &&
                              "border-accent/40 bg-accent/10 text-foreground",
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
                    className="rounded-full"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={confirmPin.length !== 4 || isSubmitting}
                    className="w-full gap-2 rounded-full"
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
        </div>
      </motion.div>
    </div>
  );
}
