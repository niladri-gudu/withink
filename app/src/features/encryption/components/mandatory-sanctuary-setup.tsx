"use client";

import * as React from "react";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEncryption } from "@/providers/encryption-provider";
import { BrandLoader } from "@/components/ui/brand-loader";
import {
  generateRandomSalt,
  generateMasterKey,
  exportKeyToHex,
  encryptText,
} from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import {
  getPlaintextEntriesForMigrationAction,
  enableClientEncryptionAction,
} from "@/features/encryption/actions/encryption-actions";

interface MandatorySanctuarySetupProps {
  diaryLockEnabled: boolean;
  diaryHasPasscode: boolean;
  onSetupSuccess: (masterKeyHex: string, salt: string, verificationCiphertext: string) => void;
}

export function MandatorySanctuarySetup({
  diaryLockEnabled,
  diaryHasPasscode,
  onSetupSuccess,
}: MandatorySanctuarySetupProps) {
  const { setEncryptionSettings, setMasterKey } = useEncryption();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pinConfirm, setPinConfirm] = React.useState("");
  const [warningChecked, setWarningChecked] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [entryCount, setEntryCount] = React.useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = React.useState(true);

  // Check how many entries need migration on mount
  React.useEffect(() => {
    const fetchEntriesInfo = async () => {
      try {
        const res = await getPlaintextEntriesForMigrationAction();
        if (res.success && res.entries) {
          setEntryCount(res.entries.length);
        } else {
          setEntryCount(0);
        }
      } catch (err) {
        console.error("Failed to load entries count:", err);
        setEntryCount(0);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchEntriesInfo();
  }, []);

  const handleSetupAndMigrate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!warningChecked) {
      toast.error("Please confirm the data recovery warning");
      return;
    }
    if (diaryLockEnabled && diaryHasPasscode && !pinConfirm) {
      toast.error("Please enter your current 4-digit PIN to secure your local key");
      return;
    }

    setIsMigrating(true);
    const toastId = toast.loading(
      entryCount && entryCount > 0 ? "Initializing zero-knowledge migration..." : "Securing your sanctuary..."
    );

    try {
      // 1. Fetch entries to encrypt
      const fetchRes = await getPlaintextEntriesForMigrationAction();
      if (!fetchRes.success || !fetchRes.entries) {
        throw new Error(fetchRes.error || "Failed to fetch entries for migration");
      }
      const entries = fetchRes.entries;

      // 2. Generate random salt and derive password key
      const salt = generateRandomSalt();
      const passwordKey = await deriveKeyFromPasswordAsync(password, salt);

      // 3. Generate secure random master key
      const newMasterKey = await generateMasterKey();
      const masterKeyHex = await exportKeyToHex(newMasterKey);

      // 4. Encrypt the master key with password key
      const verificationCiphertext = await encryptText(masterKeyHex, passwordKey);

      // 5. Encrypt all entry texts client-side
      if (entries.length > 0) {
        toast.loading(`Encrypting ${entries.length} entries...`, { id: toastId });
      }
      const encryptedEntries = [];
      for (const entry of entries) {
        const titleEnc = await encryptText(entry.title || "", newMasterKey);
        const contentHtmlEnc = await encryptText(entry.contentHtml, newMasterKey);
        const contentTextEnc = await encryptText(entry.contentText, newMasterKey);
        const contentJsonEnc = await encryptText(JSON.stringify(entry.contentJson), newMasterKey);

        const wordCount = entry.contentText.split(/\s+/).filter(Boolean).length;

        encryptedEntries.push({
          id: entry.id,
          title: titleEnc,
          contentHtml: contentHtmlEnc,
          contentText: contentTextEnc,
          contentJson: contentJsonEnc,
          wordCount,
        });
      }

      // 6. Submit settings and encrypted entries to the server
      toast.loading("Saving secure database records...", { id: toastId });
      const enableRes = await enableClientEncryptionAction(salt, verificationCiphertext, encryptedEntries);
      if (!enableRes.success) {
        throw new Error(enableRes.error || "Failed to enable client encryption");
      }

      // 7. If PIN lock is enabled, encrypt the master key with the PIN key
      if (diaryLockEnabled && diaryHasPasscode && pinConfirm) {
        const pinKey = await deriveKeyFromPasswordAsync(pinConfirm, salt, 50000);
        const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
        localStorage.setItem("withink_encrypted_master_key", encryptedMasterKey);
      } else {
        localStorage.removeItem("withink_encrypted_master_key");
      }

      // Plaintext raw key caching is removed for security compliance.
      localStorage.removeItem("withink_master_key");
      sessionStorage.removeItem("withink_master_key");

      // 8. Update client context
      setEncryptionSettings({
        isClientEncrypted: true,
        encryptionSalt: salt,
        verificationCiphertext,
      });
      setMasterKey(newMasterKey);

      // Set server-side unlock cookie!
      const { unlockSessionAction } = await import("@/features/lock/actions/lock-actions");
      await unlockSessionAction();

      toast.success(
        entries.length > 0
          ? `Migration complete! ${entries.length} entries secured.`
          : "Sanctuary Password set successfully!",
        { id: toastId }
      );

      onSetupSuccess(masterKeyHex, salt, verificationCiphertext);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Encryption setup failed";
      toast.error(message, { id: toastId });
    } finally {
      setIsMigrating(false);
    }
  };

  if (loadingInitial) {
    return <BrandLoader message="preparing your private sanctuary..." />;
  }

  const isMigratingOldData = entryCount !== null && entryCount > 0;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-background/95 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md px-6 text-center select-none animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          {/* Logo / Header */}
          <div className="mb-6 flex flex-col items-center">
            <span className="font-serif text-3xl font-bold tracking-tight text-foreground mb-2">
              withink.
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full border border-border">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>Sanctuary Setup</span>
            </div>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground mt-2">
            {isMigratingOldData ? "Secure & Migrate Your Journal" : "Create Sanctuary Password"}
          </h1>
          <p className="text-body-small text-muted-foreground max-w-md mt-2 leading-relaxed">
            {isMigratingOldData
              ? `We are transitioning Withink to a 100% Zero-Knowledge architecture. Choose a password to encrypt and secure your existing ${entryCount} journal logs locally.`
              : "Set up browser-native zero-knowledge encryption to protect your writing sanctuary. Your password is never sent to our servers."}
          </p>
        </div>

        <form onSubmit={handleSetupAndMigrate} className="space-y-5 text-left">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="zk-setup-pwd" className="text-body-small font-semibold text-foreground">
                Sanctuary Password
              </label>
              <Input
                id="zk-setup-pwd"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isMigrating}
                required
                className="h-11 rounded-xl bg-background border border-border/60 focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="zk-setup-pwd-conf" className="text-body-small font-semibold text-foreground">
                Confirm Password
              </label>
              <Input
                id="zk-setup-pwd-conf"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isMigrating}
                required
                className="h-11 rounded-xl bg-background border border-border/60 focus:ring-2 focus:ring-ring"
              />
            </div>

            {diaryLockEnabled && diaryHasPasscode && (
              <div className="space-y-2">
                <label htmlFor="zk-setup-pin-conf" className="text-body-small font-semibold text-foreground">
                  Confirm 4-digit PIN Passcode
                </label>
                <Input
                  id="zk-setup-pin-conf"
                  type="password"
                  maxLength={4}
                  placeholder="Enter current PIN"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                  disabled={isMigrating}
                  required
                  className="h-11 rounded-xl bg-background border border-border/60 text-center font-mono tracking-widest text-lg focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground/80 leading-snug">
                  Required to save your local browser key under your current device PIN lock.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/5 p-4 mt-2">
            <input
              type="checkbox"
              id="zk-mandatory-warning"
              checked={warningChecked}
              onChange={(e) => setWarningChecked(e.target.checked)}
              disabled={isMigrating}
              required
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer shrink-0"
            />
            <label htmlFor="zk-mandatory-warning" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
              I understand that Withink is 100% Zero-Knowledge. If I lose my Sanctuary Password, my data cannot be recovered by anyone, including the support team.
            </label>
          </div>

          <Button
            type="submit"
            disabled={isMigrating || !password || !confirmPassword || !warningChecked || (diaryLockEnabled && diaryHasPasscode && !pinConfirm)}
            className="w-full h-12 rounded-full font-semibold gap-2 shadow-md hover:shadow-lg transition-all mt-4"
          >
            {isMigrating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isMigratingOldData ? `Encrypting & Migrating Journal...` : "Initializing Sanctuary..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {isMigratingOldData ? "Migrate & Unlock Journal" : "Initialize Encryption"}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
