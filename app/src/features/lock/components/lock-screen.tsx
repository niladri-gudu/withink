"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Delete, ArrowLeft, Loader2, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  unlockAction,
  verifyPasswordAndResetLockAction,
  requestPasscodeResetEmailAction,
  verifyPasscodeResetCodeAction,
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

type ScreenView = "pin" | "recovery-options" | "password-verify" | "email-verify";

export function LockScreen({ onUnlockSuccess, userEmail }: LockScreenProps) {
  const [pin, setPin] = React.useState<string>("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [view, setView] = React.useState<ScreenView>("pin");
  
  const { isClientEncrypted, unlockWithPin } = useEncryption();

  // Trap focus inside the entire lock screen dialog when active
  const lockContainerRef = useFocusTrap(true);

  // Password Recovery States
  const [loginPassword, setLoginPassword] = React.useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);

  // Email Recovery States
  const [emailCode, setEmailCode] = React.useState("");
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [isSubmittingEmailCode, setIsSubmittingEmailCode] = React.useState(false);
  const emailCodeRef = React.useRef<HTMLInputElement>(null);
  const [emailCodeFocused, setEmailCodeFocused] = React.useState(false);

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
    if (pin.length === 4 && view === "pin" && !isVerifying) {
      const verify = async () => {
        setIsVerifying(true);
        const res = await unlockAction(pin);
        if (res.success) {
          if (isClientEncrypted) {
            const encryptedMasterKey = localStorage.getItem("withink_encrypted_master_key");
            if (encryptedMasterKey) {
              const decrypted = await unlockWithPin(pin, encryptedMasterKey);
              if (!decrypted) {
                setShake(true);
                setPin("");
                toast.error("Decryption failed. Your passcode key might be out of sync.");
                setIsVerifying(false);
                setTimeout(() => setShake(false), 500);
                return;
              }
            }
          }
          onUnlockSuccess();
        } else {
          setShake(true);
          setPin("");
          toast.error(res.error || "Incorrect passcode");
          setTimeout(() => setShake(false), 500);
        }
        setIsVerifying(false);
      };
      verify();
    }
  }, [pin, view, isVerifying, onUnlockSuccess, isClientEncrypted, unlockWithPin]);

  const submitPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;

    setIsSubmittingPassword(true);
    const toastId = toast.loading("Verifying your password…");
    const res = await verifyPasswordAndResetLockAction(loginPassword);

    if (res.success) {
      localStorage.removeItem("withink_encrypted_master_key");
      toast.success("Sanctuary Lock disabled successfully", { id: toastId });
      onUnlockSuccess();
    } else {
      toast.error(res.error || "Invalid password", { id: toastId });
    }
    setIsSubmittingPassword(false);
  };

  const startEmailRecovery = async () => {
    setIsSendingEmail(true);
    const toastId = toast.loading("Sending recovery code to your email…");
    const res = await requestPasscodeResetEmailAction();

    if (res.success) {
      toast.success("Recovery code sent to your email", { id: toastId });
      setView("email-verify");
    } else {
      toast.error(res.error || "Failed to send email", { id: toastId });
    }
    setIsSendingEmail(false);
  };

  const submitEmailCodeRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmittingEmailCode(true);
    const toastId = toast.loading("Verifying recovery code…");
    const res = await verifyPasscodeResetCodeAction(emailCode);

    if (res.success) {
      localStorage.removeItem("withink_encrypted_master_key");
      toast.success("Sanctuary Lock disabled successfully", { id: toastId });
      onUnlockSuccess();
    } else {
      toast.error(res.error || "Invalid or expired code", { id: toastId });
    }
    setIsSubmittingEmailCode(false);
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

              {/* Display Indicators */}
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

              {/* Tactile Keypad */}
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

              {/* Forgot Passcode Recovery Link */}
              <button
                onClick={() => setView("recovery-options")}
                className="text-body-small text-muted-foreground hover:text-accent font-medium transition-colors"
              >
                Forgot passcode?
              </button>
            </motion.div>
          )}

          {view === "recovery-options" && (
            <motion.div
              key="recovery-options-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Sanctuary Recovery
              </h2>
              <p className="text-body-small text-muted-foreground mb-8 max-w-xs">
                Select a verification method to disable your passcode lock and access your diary.
              </p>

              <div className="w-full space-y-4">
                <Button
                  variant="outline"
                  className="w-full rounded-xl py-6 gap-3"
                  onClick={() => setView("password-verify")}
                >
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                  <span>Use account password</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-xl py-6 gap-3"
                  onClick={startEmailRecovery}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>Send code to {userEmail || "email"}</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full rounded-xl py-5 gap-2 text-muted-foreground hover:text-foreground mt-4"
                  onClick={() => setView("pin")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to PIN</span>
                </Button>
              </div>
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
                Verify Account Password
              </h2>
              <p className="text-body-small text-muted-foreground mb-6 max-w-xs">
                Enter the login password associated with your account.
              </p>

              <form onSubmit={submitPasswordRecovery} className="w-full space-y-4">
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter login password"
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
                  Reset Passcode Lock
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl py-5 gap-2 text-muted-foreground hover:text-foreground mt-2"
                  onClick={() => setView("recovery-options")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Recovery Options</span>
                </Button>
              </form>
            </motion.div>
          )}

          {view === "email-verify" && (
            <motion.div
              key="email-verify-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Enter Recovery Code
              </h2>
              <p className="text-body-small text-muted-foreground mb-6 max-w-xs">
                We&apos;ve sent a 6-digit recovery code to your registered email address.
              </p>

              <form onSubmit={submitEmailCodeRecovery} className="w-full space-y-5">
                <div className="relative flex justify-center gap-2 py-1 cursor-text" onClick={() => emailCodeRef.current?.focus()}>
                  {Array.from({ length: 6 }, (_, i) => {
                    const char = emailCode[i] || "";
                    const isBoxFocused = emailCodeFocused && (emailCode.length === i || (emailCode.length === 6 && i === 5));
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg border border-border text-lg font-bold transition-all bg-background/50",
                          isBoxFocused && "border-accent ring-2 ring-ring/30 ring-offset-background scale-[1.05]",
                          char && "border-accent/40 bg-accent/10 text-foreground"
                        )}
                      >
                        {char || ""}
                      </div>
                    );
                  })}
                  <input
                    id="email-code"
                    ref={emailCodeRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setEmailCodeFocused(true)}
                    onBlur={() => setEmailCodeFocused(false)}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-text select-none"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl py-6"
                  disabled={isSubmittingEmailCode}
                >
                  {isSubmittingEmailCode ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Verify Code
                </Button>

                <div className="flex flex-col gap-2 w-full">
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={startEmailRecovery}
                    disabled={isSendingEmail}
                  >
                    Resend Email Code
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl py-5 gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setView("recovery-options")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Recovery Options</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
