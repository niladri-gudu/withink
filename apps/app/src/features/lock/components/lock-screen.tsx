"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { cn } from "@withink/utils";
import { ArrowLeft, Delete, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { GateLayout } from "@/components/gate-layout";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";

import { unlockAction } from "../actions/lock-actions";

interface LockScreenProps {
  onUnlockSuccess: () => void;
  /** Re-locks the session if the background server verification rejects the PIN
   *  (e.g. the passcode was rotated on another device). */
  onServerReject?: () => void;
  /** Which screen to boot into (used by the shell after a rejected unlock). */
  initialView?: ScreenView;
  userEmail?: string | null;
}

type ScreenView = "pin" | "password-verify";

export function LockScreen({
  onUnlockSuccess,
  onServerReject,
  initialView = "pin",
}: LockScreenProps) {
  const [pin, setPin] = React.useState<string>("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [view, setView] = React.useState<ScreenView>(initialView);
  const isMounted = React.useRef(true);
  // Latch set once the passcode has been verified & decrypted so the auto-submit
  // effect can never re-fire (e.g. while the parent transitions post-unlock).
  const didUnlock = React.useRef(false);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { isClientEncrypted, unlockWithPin, unlockWithPassword } =
    useEncryption();

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

        const encryptedMasterKey = isClientEncrypted
          ? localStorage.getItem("withink_encrypted_master_key")
          : null;

        // Fast path: the PIN is verified locally by decrypting the per-device
        // master key (PBKDF2 runs in a Web Worker and the derived key is
        // cached, so this is ~100-300ms). Reveal the diary the instant the key
        // unwraps — no network round-trip gates the unlock. The server
        // verification then finishes in the background; if it rejects the PIN,
        // the shell rolls the session back.
        if (encryptedMasterKey) {
          setIsDecrypting(true);
          const decrypted = await unlockWithPin(pin, encryptedMasterKey);

          if (decrypted) {
            didUnlock.current = true;
            if (isMounted.current) {
              setPin("");
              setIsDecrypting(false);
              setIsVerifying(false);
            }
            onUnlockSuccess();

            // Background server verification. Note: this deliberately runs even
            // after the LockScreen unmounts (isMounted goes false on success),
            // because a rejected PIN must still roll the whole session back.
            void unlockAction(pin).then((res) => {
              if (!res.success) {
                onServerReject?.();
              }
            });
            return;
          }

          // Local decrypt failed — fall through to the server to distinguish a
          // wrong PIN from an out-of-sync per-device key.
          if (isMounted.current) setIsDecrypting(false);
          const res = await unlockAction(pin);
          if (res.success) {
            if (isMounted.current) {
              setPin("");
              toast.error(
                "Passcode is out of sync. Use your Diary Password to unlock.",
              );
              setIsVerifying(false);
              setView("password-verify");
            }
            return;
          }
          if (isMounted.current) {
            setShake(true);
            setPin("");
            toast.error(res.error || "Incorrect passcode");
            setTimeout(() => setShake(false), 500);
            setIsVerifying(false);
          }
          return;
        }

        // Legacy path (not client-encrypted): the server is the only authority.
        const res = await unlockAction(pin);
        if (res.success) {
          didUnlock.current = true;
          if (isMounted.current) {
            setPin("");
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
  }, [
    pin,
    view,
    isVerifying,
    onUnlockSuccess,
    onServerReject,
    isClientEncrypted,
    unlockWithPin,
  ]);

  const submitPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;

    setIsSubmittingPassword(true);
    const toastId = toast.loading("Verifying your Diary Password…");
    const success = await unlockWithPassword(loginPassword);

    if (success) {
      localStorage.removeItem("withink_encrypted_master_key");
      toast.success("Diary Lock disabled successfully", { id: toastId });
      onUnlockSuccess();
      if (isMounted.current) {
        setIsSubmittingPassword(false);
      }
      return;
    }
    if (isMounted.current) {
      toast.error("Incorrect Diary Password", { id: toastId });
      setIsSubmittingPassword(false);
    }
  };

  return (
    <GateLayout containerRef={lockContainerRef}>
      <AnimatePresence mode="wait">
        {view === "pin" && (
          <motion.div
            key="pin-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex w-full flex-col items-center"
          >
            <div className="space-y-1.5 text-center">
              <h2 className="text-h2 text-foreground font-serif font-bold">
                Welcome back
              </h2>
              <p className="text-caption font-serif tracking-[0.16em] uppercase">
                Diary Lock
              </p>
            </div>

            {/* Display Indicators or Decrypting Spinner */}
            {isDecrypting ? (
              <motion.div
                key="decrypting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 flex h-16 flex-col items-center justify-center gap-4"
              >
                <Loader2 className="text-accent h-6 w-6 animate-spin" />
                <span className="text-muted-foreground font-serif text-xs tracking-wider uppercase">
                  Decrypting your diary…
                </span>
              </motion.div>
            ) : (
              <motion.div
                role="status"
                aria-live="polite"
                aria-label={`Passcode: ${pin.length} of 4 digits entered`}
                animate={
                  shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}
                }
                transition={{ duration: 0.4 }}
                className="mb-8 flex h-16 items-center justify-center gap-3.5"
              >
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "border-border/80 h-4.5 w-4.5 rounded-full border transition-all duration-200",
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
                <div className="mb-8 grid max-w-[280px] grid-cols-3 justify-items-center gap-x-6 gap-y-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <motion.button
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="border-border bg-card text-foreground hover:bg-secondary/80 focus-visible:ring-ring flex h-16 w-16 items-center justify-center rounded-full border text-xl font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {num}
                    </motion.button>
                  ))}

                  <motion.button
                    onClick={handleClear}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-16 w-16 items-center justify-center rounded-full border border-transparent text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Clear
                  </motion.button>

                  <motion.button
                    onClick={() => handleKeyPress("0")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="border-border bg-card text-foreground hover:bg-secondary/80 focus-visible:ring-ring flex h-16 w-16 items-center justify-center rounded-full border text-xl font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    0
                  </motion.button>

                  <motion.button
                    onClick={handleBackspace}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Backspace"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-16 w-16 items-center justify-center rounded-full border border-transparent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Delete className="h-5 w-5" />
                  </motion.button>
                </div>
              )}

              {/* Use Diary Password fallback */}
              {!isDecrypting && (
                <button
                  onClick={() => setView("password-verify")}
                  className="text-body-small text-muted-foreground hover:text-accent font-medium transition-colors"
                >
                  Use Diary Password instead
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
              className="flex w-full flex-col items-center"
            >
              <div className="space-y-1.5 text-center">
                <h2 className="text-h2 text-foreground font-serif font-bold">
                  Verify Diary Password
                </h2>
                <p className="text-caption font-serif tracking-[0.16em] uppercase">
                  Diary Lock
                </p>
              </div>
              <p className="text-body-small text-muted-foreground mt-2 mb-6 max-w-xs">
                Enter your Diary Password to disable the PIN lock and access
                your diary.
              </p>

              <form
                onSubmit={submitPasswordRecovery}
                className="w-full space-y-4"
              >
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter Diary Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-12 rounded-xl"
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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Unlock with Password
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground mt-2 w-full gap-2 rounded-xl py-5"
                  onClick={() => setView("pin")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to PIN</span>
                </Button>
              </form>
            </motion.div>
          )}
      </AnimatePresence>
    </GateLayout>
  );
}
