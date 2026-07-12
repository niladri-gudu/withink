"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Check, Loader2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { unlockAction, saveLockSettingsAction } from "../actions/lock-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LockChangeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ChangeStep = "verify-current" | "new-pin" | "confirm-pin";

export function LockChangeModal({ onClose, onSuccess }: LockChangeModalProps) {
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [confirmNewPin, setConfirmNewPin] = React.useState("");
  const [step, setStep] = React.useState<ChangeStep>("verify-current");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [shake, setShake] = React.useState(false);

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
  }, [currentPin, step]);

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

    setIsSubmitting(true);
    const toastId = toast.loading("Updating your passcode…");

    const res = await saveLockSettingsAction({
      isLockEnabled: true,
      passcode: newPin,
      autoLockTimeout: 300,
      lockOnTabHide: true,
    });

    if (res.success) {
      toast.success("Passcode changed successfully!", { id: toastId });
      onSuccess();
    } else {
      toast.error(res.error || "Failed to update passcode", { id: toastId });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl sm:p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
          aria-label="Close"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent mb-5">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            Change Passcode
          </h2>
          <p className="text-body-small text-muted-foreground mb-6 max-w-sm">
            Update the secure PIN used to lock your diary.
          </p>

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
                  <label htmlFor="current-pin" className="text-body-small font-medium text-foreground block">
                    Enter current passcode
                  </label>
                  <motion.div
                    animate={shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="relative flex justify-center gap-3 py-1 cursor-text"
                    onClick={() => currentRef.current?.focus()}
                  >
                    {Array.from({ length: 4 }, (_, i) => {
                      const char = currentPin[i] || "";
                      const isBoxFocused = currentFocused && (currentPin.length === i || (currentPin.length === 4 && i === 3));
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-lg border border-border text-lg font-bold transition-all bg-background/50",
                            isBoxFocused && "border-accent ring-2 ring-ring/30 ring-offset-background scale-[1.05]",
                            char && "border-accent/40 bg-accent/10 text-foreground"
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
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                      onFocus={() => setCurrentFocused(true)}
                      onBlur={() => setCurrentFocused(false)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-text select-none"
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
                  <label htmlFor="new-pin-input" className="text-body-small font-medium text-foreground block">
                    Enter new 4-digit passcode
                  </label>
                  <div
                    className="relative flex justify-center gap-3 py-1 cursor-text"
                    onClick={() => newRef.current?.focus()}
                  >
                    {Array.from({ length: 4 }, (_, i) => {
                      const char = newPin[i] || "";
                      const isBoxFocused = newFocused && (newPin.length === i || (newPin.length === 4 && i === 3));
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-lg border border-border text-lg font-bold transition-all bg-background/50",
                            isBoxFocused && "border-accent ring-2 ring-ring/30 ring-offset-background scale-[1.05]",
                            char && "border-accent/40 bg-accent/10 text-foreground"
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
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      onFocus={() => setNewFocused(true)}
                      onBlur={() => setNewFocused(false)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-text select-none"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={newPin.length !== 4} className="rounded-full px-6">
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
                  <label htmlFor="confirm-pin-input" className="text-body-small font-medium text-foreground block">
                    Confirm new passcode
                  </label>
                  <div
                    className="relative flex justify-center gap-3 py-1 cursor-text"
                    onClick={() => confirmRef.current?.focus()}
                  >
                    {Array.from({ length: 4 }, (_, i) => {
                      const char = confirmNewPin[i] || "";
                      const isBoxFocused = confirmFocused && (confirmNewPin.length === i || (confirmNewPin.length === 4 && i === 3));
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-lg border border-border text-lg font-bold transition-all bg-background/50",
                            isBoxFocused && "border-accent ring-2 ring-ring/30 ring-offset-background scale-[1.05]",
                            char && "border-accent/40 bg-accent/10 text-foreground"
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
                      onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-text select-none"
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
                    className="rounded-full"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={confirmNewPin.length !== 4 || isSubmitting}
                    className="w-full rounded-full gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Confirm & Update
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
