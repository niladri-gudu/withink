"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useEncryption } from "@/providers/encryption-provider";

import {
  bindUnlockProofWithCodeAction,
  requestPasscodeResetEmailAction,
} from "../../lock/actions/lock-actions";

/**
 * One-time security upgrade for diaries created before unlock-proof binding
 * existed. The diary password was verified locally, but the server will not
 * stream content until this account binds its unlock proof — confirmed via a
 * code sent to the account's email. This screen never appears again once
 * binding succeeds.
 */
export function UnlockProofBindCard() {
  const router = useRouter();
  const { getUnlockProof, setProofBindingRequired } = useEncryption();
  const [codeSent, setCodeSent] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handleSendCode = async () => {
    setIsSending(true);
    try {
      const res = await requestPasscodeResetEmailAction();
      if (res.success) {
        setCodeSent(true);
        toast.success("Verification code sent to your email.");
      } else {
        toast.error(res.error || "Failed to send the email. Try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || code.length !== 6) return;
    setIsVerifying(true);
    try {
      const proof = await getUnlockProof();
      if (!proof) {
        toast.error("Session locked. Please unlock again.");
        return;
      }
      const res = await bindUnlockProofWithCodeAction(code, proof);
      if (res.success) {
        setProofBindingRequired(false);
        toast.success("Security upgrade complete.");
        setTimeout(() => router.refresh(), 0);
      } else {
        toast.error(res.error || "Invalid or expired code.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.assign("/login");
  };

  return (
    <div className="bg-background/90 animate-in fade-in fixed inset-0 z-[9990] flex items-center justify-center p-4 backdrop-blur-sm duration-200">
      <div className="border-border bg-card animate-in zoom-in-95 w-full max-w-md rounded-xl border p-6 shadow-xl duration-200 sm:p-8">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="border-accent/20 bg-accent/10 text-accent mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-h2 text-foreground font-serif font-bold">
            One-time security upgrade
          </h1>
          <p className="text-body-small text-muted-foreground mt-2">
            Your diary password was verified. To finish unlocking, confirm
            it&apos;s really you with a one-time code — this upgrades your diary
            to our latest security standard and won&apos;t appear again.
          </p>
        </div>

        {!codeSent ? (
          <Button
            onClick={handleSendCode}
            disabled={isSending}
            className="w-full gap-2 rounded-xl py-6"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MailCheck className="h-4 w-4" />
            )}
            Email me a code
          </Button>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="proof-bind-code"
                className="text-body-small text-foreground block text-center font-medium"
              >
                Enter the 6-digit code
              </label>
              <Input
                id="proof-bind-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center font-mono text-lg tracking-[0.5em]"
                placeholder="000000"
                autoFocus
                required
              />
              <p className="text-muted-foreground text-center text-[11px]">
                Sent to your account email. Expires in 15 minutes.
              </p>
            </div>
            <Button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="w-full gap-2 rounded-xl py-6"
            >
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify &amp; unlock
            </Button>
          </form>
        )}

        <button
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground mt-6 block w-full cursor-pointer text-center font-serif text-xs tracking-[0.16em] uppercase transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
