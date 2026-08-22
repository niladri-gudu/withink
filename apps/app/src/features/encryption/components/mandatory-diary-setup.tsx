"use client";

import * as React from "react";
import { BrandLoader } from "@withink/ui/brand-loader";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { GateLayout } from "@/components/gate-layout";
import {
  encryptText,
  exportKeyToHex,
  generateMasterKey,
  generateRandomSalt,
} from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { useEncryption } from "@/providers/encryption-provider";
import {
  enableClientEncryptionAction,
  getPlaintextEntriesForMigrationAction,
} from "@/features/encryption/actions/encryption-actions";

interface MandatoryDiarySetupProps {
  diaryLockEnabled: boolean;
  diaryHasPasscode: boolean;
  onSetupSuccess: (
    masterKeyHex: string,
    salt: string,
    verificationCiphertext: string,
    pin: string,
  ) => void;
}

export function MandatoryDiarySetup({
  diaryLockEnabled,
  diaryHasPasscode,
  onSetupSuccess,
}: MandatoryDiarySetupProps) {
  const { setEncryptionSettings, setMasterKey } = useEncryption();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [pinConfirm, setPinConfirm] = React.useState("");
  const [warningChecked, setWarningChecked] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [entryCount, setEntryCount] = React.useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [step, _setStep] = React.useState<"password" | "pin">("password");

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

    setIsMigrating(true);
    const toastId = toast.loading(
      entryCount && entryCount > 0
        ? "Initializing zero-knowledge migration..."
        : "Securing your diary...",
    );

    try {
      // 1. Fetch entries to encrypt
      const fetchRes = await getPlaintextEntriesForMigrationAction();
      if (!fetchRes.success || !fetchRes.entries) {
        throw new Error(
          fetchRes.error || "Failed to fetch entries for migration",
        );
      }
      const entries = fetchRes.entries;

      // 2. Generate random salt and derive password key
      const salt = generateRandomSalt();
      const passwordKey = await deriveKeyFromPasswordAsync(password, salt);

      // 3. Generate secure random master key
      const newMasterKey = await generateMasterKey();
      const masterKeyHex = await exportKeyToHex(newMasterKey);

      // 4. Encrypt the master key with password key
      const verificationCiphertext = await encryptText(
        masterKeyHex,
        passwordKey,
      );

      // 5. Encrypt all entry texts client-side
      if (entries.length > 0) {
        toast.loading(`Encrypting ${entries.length} entries...`, {
          id: toastId,
        });
      }
      const encryptedEntries = [];
      for (const entry of entries) {
        const titleEnc = await encryptText(entry.title || "", newMasterKey);
        const contentHtmlEnc = await encryptText(
          entry.contentHtml,
          newMasterKey,
        );
        const contentTextEnc = await encryptText(
          entry.contentText,
          newMasterKey,
        );
        const contentJsonEnc = await encryptText(
          JSON.stringify(entry.contentJson),
          newMasterKey,
        );

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
      const enableRes = await enableClientEncryptionAction(
        salt,
        verificationCiphertext,
        encryptedEntries,
      );
      if (!enableRes.success) {
        throw new Error(
          enableRes.error || "Failed to enable client encryption",
        );
      }

      // 7. If diary lock is enabled, encrypt the master key with the PIN key
      if (diaryLockEnabled && diaryHasPasscode && pin) {
        const pinKey = await deriveKeyFromPasswordAsync(pin, salt, 50000);
        const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
        localStorage.setItem(
          "withink_encrypted_master_key",
          encryptedMasterKey,
        );
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
      const { unlockSessionAction } = await import(
        "@/features/lock/actions/lock-actions"
      );
      await unlockSessionAction();

      toast.success(
        entries.length > 0
          ? `Migration complete! ${entries.length} entries secured.`
          : "Diary Password set successfully!",
        { id: toastId },
      );

      if (diaryLockEnabled && diaryHasPasscode) {
        // Pass PIN to parent so it can proceed to PIN setup flow
        onSetupSuccess(masterKeyHex, salt, verificationCiphertext, pin);
      } else {
        onSetupSuccess(masterKeyHex, salt, verificationCiphertext, "");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Encryption setup failed";
      toast.error(message, { id: toastId });
    } finally {
      setIsMigrating(false);
    }
  };

  if (loadingInitial) {
    return <BrandLoader message="preparing your private diary..." />;
  }

  const isMigratingOldData = entryCount !== null && entryCount > 0;
  const needsPin = diaryLockEnabled && diaryHasPasscode;

  return (
    <GateLayout>
      <div className="flex flex-col items-center text-center">
        <div className="space-y-1.5 text-center">
          <h1 className="text-h2 text-foreground font-serif font-bold">
            {isMigratingOldData
              ? "Secure & Migrate Your Journal"
              : "Create Diary Password"}
          </h1>
          <p className="text-caption font-serif tracking-[0.16em] uppercase">
            Diary Setup
          </p>
        </div>
        <p className="text-body-small text-muted-foreground mt-2 max-w-md leading-relaxed">
          {isMigratingOldData
            ? `We are transitioning Withink to a 100% Zero-Knowledge architecture. Choose a password to encrypt and secure your existing ${entryCount} journal logs locally.`
            : "Set up browser-native zero-knowledge encryption to protect your writing diary. Your password is never sent to our servers."}
        </p>
      </div>

        {/* ⚠️ Zero-Knowledge Warning */}
        <div className="border-destructive/20 bg-destructive/5 mb-4 rounded-2xl border p-4 text-left">
          <label
            htmlFor="zk-setup-warning"
            className="flex cursor-pointer items-start gap-3"
          >
            <input
              type="checkbox"
              id="zk-setup-warning"
              checked={warningChecked}
              onChange={(e) => setWarningChecked(e.target.checked)}
              disabled={isMigrating}
              className="border-border text-accent focus:ring-accent mt-1 h-4 w-4 rounded"
            />
            <span className="text-muted-foreground text-[11px] leading-relaxed select-none">
              This is a{" "}
              <strong className="text-foreground">100% Zero-Knowledge</strong>{" "}
              system. If you lose your Diary Password, your data{" "}
              <strong className="text-foreground">
                cannot be recovered by anyone
              </strong>{" "}
              — not us, not you. There is no &quot;forgot password&quot; for this.
              Store it in a password manager.
            </span>
          </label>
        </div>

        <form onSubmit={handleSetupAndMigrate} className="space-y-5 text-left">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="zk-setup-pwd"
                className="text-body-small text-foreground font-semibold"
              >
                Diary Password
              </label>
              <Input
                id="zk-setup-pwd"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isMigrating}
                required
                minLength={8}
                className="bg-background border-border/60 focus:ring-ring h-11 rounded-xl border focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="zk-setup-pwd-conf"
                className="text-body-small text-foreground font-semibold"
              >
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
                className="bg-background border-border/60 focus:ring-ring h-11 rounded-xl border focus:ring-2"
              />
            </div>

            {needsPin && step === "password" && (
              <>
                <div className="space-y-2 pt-2">
                  <label
                    htmlFor="zk-setup-pin"
                    className="text-body-small text-foreground font-semibold"
                  >
                    Create a 4-digit PIN
                  </label>
                  <Input
                    id="zk-setup-pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    disabled={isMigrating}
                    required
                    className="bg-background border-border/60 focus:ring-ring h-11 rounded-xl border text-center font-serif text-lg tracking-widest focus:ring-2"
                  />
                  <p className="text-muted-foreground/80 text-[10px] leading-snug">
                    This PIN locks your local encrypted key on this device.
                    You&apos;ll need it to unlock quickly.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="zk-setup-pin-conf"
                    className="text-body-small text-foreground font-semibold"
                  >
                    Confirm PIN
                  </label>
                  <Input
                    id="zk-setup-pin-conf"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pinConfirm}
                    onChange={(e) =>
                      setPinConfirm(e.target.value.replace(/\D/g, ""))
                    }
                    disabled={isMigrating}
                    required
                    className="bg-background border-border/60 focus:ring-ring h-11 rounded-xl border text-center font-serif text-lg tracking-widest focus:ring-2"
                  />
                </div>
              </>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              isMigrating ||
              !password ||
              password.length < 8 ||
              password !== confirmPassword ||
              !warningChecked ||
              (needsPin && (pin.length !== 4 || pin !== pinConfirm))
            }
            className="mt-4 h-12 w-full gap-2 font-semibold shadow-md transition-all hover:shadow-lg"
          >
            {isMigrating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isMigratingOldData
                  ? `Encrypting & Migrating Journal...`
                  : "Initializing Diary..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {isMigratingOldData
                  ? "Migrate & Unlock Journal"
                  : "Initialize Encryption"}
              </>
            )}
          </Button>
      </form>
    </GateLayout>
  );
}
