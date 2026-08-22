"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { KeyRound, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { GateLayout } from "@/components/gate-layout";
import { useEncryption } from "@/providers/encryption-provider";

interface DiaryPasswordUnlockScreenProps {
  userEmail?: string | null;
  onUnlockSuccess?: () => void;
}

export function DiaryPasswordUnlockScreen({
  userEmail: _userEmail,
  onUnlockSuccess,
}: DiaryPasswordUnlockScreenProps) {
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
      toast.error("Incorrect Diary Password. Please try again.");
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
    <GateLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex w-full flex-col items-center"
      >
        <div className="space-y-1.5 text-center">
          <h1 className="text-h2 text-foreground font-serif font-bold">
            Unlock Your Diary
          </h1>
          <p className="text-caption font-serif tracking-[0.16em] uppercase">
            Diary Encrypted
          </p>
        </div>

        <p className="text-body-small text-muted-foreground mt-2 mb-6 max-w-xs">
          Your diary is protected with client-side zero-knowledge encryption.
          Enter your Diary Password to unlock.
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
                id="diary-password"
                type="password"
                placeholder="Enter Diary Password"
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
              Unlock Diary
            </Button>
          </form>
      </motion.div>
    </GateLayout>
  );
}
