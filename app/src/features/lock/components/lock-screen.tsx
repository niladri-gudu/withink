"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Delete, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  unlockAction,
} from "../actions/lock-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";

interface LockScreenProps {
  onUnlockSuccess: () => void;
  userEmail?: string | null;
}

type ScreenView = "pin" | "password-verify";

export function LockScreen({ onUnlockSuccess }: LockScreenProps) {
  const [pin, setPin] = React.useState<string>("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [view, setView] = React.useState<ScreenView>("pin");
  const isMounted = React.useRef(true);
  // Latch set once the passcode has been verified & decrypted so the auto-submit
  // effect can never re-fire (e.g. while the parent transitions post-unlock).
  const didUnlock = React.useRef(false);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const { isClientEncrypted, unlockWithPin, unlockWithPassword } = useEncryption();

  // Trap focus inside the entire lock screen dialog when active
  const lockContainerRef = useFocusTrap(true);

  // Password Recovery States
  const [loginPassword, setLoginPassword] = React.useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);

  const handleKeyPress = React.useCallback(
    (digit: string) => {
      if (pin.length < 6 && /^\d$/.test(digit)) {
        setPin((prev) => prev + digit);
      }
    },
    [pin],
  );

  const handleBackspace = React.useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = React.useCallback(() => {
    setPin("");
  }, []);

  // Keyboard support
  React.useEffect(() => {
    if (view !== "pin") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, handleKeyPress, handleBackspace, handleClear]);

  // Auto-submit when passcode is 4 digits
  React.useEffect(() => {
    if (didUnlock.current) return;
    if (pin.length === 4 && view === "pin" && !isVerifying) {
      const verify = async () => {
        setIsVerifying(true);
        const res = await unlockAction(pin);
        if (res.success) {
          if (isClientEncrypted) {
            const encryptedMasterKey = localStorage.getItem("withink_encrypted_master_key");
            if (encryptedMasterKey) {
              setIsDecrypting(true);
              const decrypted = await unlockWithPin(pin, encryptedMasterKey);
              if (!decrypted) {
                if (isMounted.current) {
                  setIsDecrypting(false);
                  setPin("");
                  toast.error("Passcode is out of sync. Use your Sanctuary Password to unlock.");
                  setIsVerifying(false);
                  setView("password-verify");
                }
                return;
              }
            }
          }
          didUnlock.current = true;
          if (isMounted.current) {
            setPin("");
            setIsDecrypting(false);
            setIsVerifying(false);
          }
          onUnlockSuccess();
        } else {
          if (isMounted.current) {
            setShake(true);
            setPin("");
            toast.error(res.error || "Incorrect passcode");
            setTimeout(() => setShake(false), 500);
            setIsVerifying(false);
          }
        }
      };
      verify();
    }
  }, [pin, view, isVerifying, onUnlockSuccess, isClientEncrypted, unlockWithPin]);

  const submitPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;

    setIsSubmittingPassword(true);
    const toastId = toast.loading("Verifying your Sanctuary Password…");
    const success = await unlockWithPassword(loginPassword);

    if (success) {
      localStorage.removeItem("withink_encrypted_master_key");
      toast.success("Sanctuary Lock disabled successfully", { id: toastId });
      onUnlockSuccess();
      if (isMounted.current) {
        setIsSubmittingPassword(false);
      }
      return;
    }
    if (isMounted.current) {
      toast.error("Incorrect Sanctuary Password", { id: toastId });
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div
      ref={lockContainerRef as React.RefObject<HTMLDivElement>}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md select-none"
    >
      <div className="w-full max-w-sm px-6 text-center">
        <AnimatePresence mode="wait">
          {view === "pin" && (
            <motion.div
              key="pin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Logo / Header */}
              <div className="mb-6 flex flex-col items-center">
                <span className="font-serif text-3xl font-bold tracking-tight text-foreground mb-2">
                  withink.
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full border border-border">
                  <Lock className="h-3.5 w-3.5 text-accent" />
                  <span>Sanctuary Lock</span>
                </div>
              </div>

              {/* Display Indicators or Decrypting Spinner */}
              {isDecrypting ? (
                <motion.div
                  key="decrypting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-4 h-16 mb-8"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Decrypting your sanctuary…
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  role="status"
                  aria-live="polite"
                  aria-label={`Passcode: ${pin.length} of 4 digits entered`}
                  animate={shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex items-center justify-center gap-3.5 h-16 mb-8"
                >
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-4.5 w-4.5 rounded-full border border-border/80 transition-all duration-200",
                        pin.length > idx
                          ? "bg-foreground scale-110 shadow-sm"
                          : "bg-secondary/40",
                      )}
                    />
                  ))}
                </motion.div>
              )}

              {/* Tactile Keypad */}
              {!isDecrypting && (
                <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center mb-8 max-w-[280px]">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <motion.button
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card text-xl font-medium text-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
                    >
                      {num}
                    </motion.button>
                  ))}

                  <motion.button
                    onClick={handleClear}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-transparent text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Clear
                  </motion.button>

                  <motion.button
                    onClick={() => handleKeyPress("0")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card text-xl font-medium text-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
                  >
                    0
                  </motion.button>

                  <motion.button
                    onClick={handleBackspace}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Backspace"
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Delete className="h-5 w-5" />
                  </motion.button>
                </div>
              )}

              {/* Use Sanctuary Password fallback */}
              {!isDecrypting && (
                <button
                  onClick={() => setView("password-verify")}
                  className="text-body-small text-muted-foreground hover:text-accent font-medium transition-colors"
                >
                  Use Sanctuary Password instead
                </button>
              )}
            </motion.div>
          )}

          {view === "password-verify" && (
            <motion.div
              key="password-verify-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Verify Sanctuary Password
              </h2>
              <p className="text-body-small text-muted-foreground mb-6 max-w-xs">
                Enter your Sanctuary Password to disable the PIN lock and access your diary.
              </p>

              <form onSubmit={submitPasswordRecovery} className="w-full space-y-4">
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter Sanctuary Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="rounded-xl h-12"
                  autoComplete="current-password"
                  autoFocus
                  required
                />

                <Button
                  type="submit"
                  className="w-full rounded-xl py-6"
                  disabled={isSubmittingPassword}
                >
                  {isSubmittingPassword ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Unlock with Password
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl py-5 gap-2 text-muted-foreground hover:text-foreground mt-2"
                  onClick={() => setView("pin")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to PIN</span>
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
