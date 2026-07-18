"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useEncryption } from "@/providers/encryption-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md select-none">
      <div className="w-full max-w-sm px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          {/* Logo / Header */}
          <div className="mb-6 flex flex-col items-center">
            <span className="font-serif text-3xl font-bold tracking-tight text-foreground mb-2">
              withink.
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full border border-border">
              <Lock className="h-3.5 w-3.5 text-accent" />
              <span>Sanctuary Encrypted</span>
            </div>
          </div>

          <p className="text-body-small text-muted-foreground mb-6 max-w-xs">
            Your diary is protected with client-side zero-knowledge encryption. Enter your Sanctuary Password to unlock.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <motion.div
              className="space-y-2"
              animate={shake ? { x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Input
                ref={inputRef}
                id="sanctuary-password"
                type="password"
                placeholder="Enter Sanctuary Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-12 text-center"
                autoComplete="current-password"
                autoFocus
                disabled={isVerifying}
                required
              />
            </motion.div>

            <Button
              type="submit"
              className="w-full rounded-xl py-6 gap-2"
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
