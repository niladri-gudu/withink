"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { useEncryption } from "@/providers/encryption-provider";

interface SanctuaryPasswordUnlockScreenProps {
  userEmail?: string | null;
  onUnlockSuccess?: () => void;
}

export function SanctuaryPasswordUnlockScreen({
  userEmail: _userEmail,
  onUnlockSuccess,
}: SanctuaryPasswordUnlockScreenProps) {
  const [password, setPassword] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const { unlockWithPassword } = useEncryption();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || !password) return;

    setIsVerifying(true);
    const success = await unlockWithPassword(password);
    if (success) {
      onUnlockSuccess?.();
    } else {
      toast.error("Incorrect Sanctuary Password. Please try again.");
      setPassword("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    setIsVerifying(false);
  };

  return (
    <div className="bg-background/95 fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-md select-none">
      <div className="w-full max-w-sm px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          {/* Logo / Header */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-foreground mb-2 font-serif text-3xl font-bold tracking-tight">
              withink.
            </span>
            <div className="text-muted-foreground bg-secondary/80 border-border flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
              <Lock className="text-accent h-3.5 w-3.5" />
              <span>Sanctuary Encrypted</span>
            </div>
          </div>

          <p className="text-body-small text-muted-foreground mb-6 max-w-xs">
            Your diary is protected with client-side zero-knowledge encryption.
            Enter your Sanctuary Password to unlock.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <motion.div
              className="space-y-2"
              animate={
                shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}
              }
              transition={{ duration: 0.5 }}
            >
              <Input
                ref={inputRef}
                id="sanctuary-password"
                type="password"
                placeholder="Enter Sanctuary Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl text-center"
                autoComplete="current-password"
                autoFocus
                disabled={isVerifying}
                required
              />
            </motion.div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-xl py-6"
              disabled={isVerifying || !password}
            >
              {isVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              Unlock Sanctuary
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
