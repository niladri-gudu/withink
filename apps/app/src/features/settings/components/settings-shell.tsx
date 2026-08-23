/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Card } from "@withink/ui/card";
import { Input } from "@withink/ui/input";
import { cn } from "@withink/utils";
import {
  AlertTriangle,
  Camera,
  Check,
  CreditCard,
  Link as LinkIcon,
  Loader2,
  Lock,
  LogOut,
  MonitorSmartphone,
  Moon,
  Palette,
  Ruler,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authClient, clearSessionCookies } from "@/lib/auth-client";
import {
  decryptText,
  deriveUnlockProofHex,
  encryptText,
  exportKeyToHex,
  generateMasterKey,
  generateRandomSalt,
} from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { safeStorage } from "@/lib/safe-storage";
import { clearSwCaches } from "@/lib/sw-cache";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";
import {
  enableClientEncryptionAction,
  getPlaintextEntriesForMigrationAction,
  updateDiaryPasswordAction,
} from "@/features/encryption/actions/encryption-actions";
import { DataExportCard } from "@/features/export/components/data-export-card";
import {
  getLockSettingsAction,
  saveLockSettingsAction,
} from "@/features/lock/actions/lock-actions";
import { LockChangeModal } from "@/features/lock/components/lock-change-modal";
import { LockSetupOnboarding } from "@/features/lock/components/lock-setup-onboarding";

import { deleteAccountAction } from "../actions/settings-actions";

const PAPER_SCALE_KEY = "withink-paper-scale";
const INITIAL_SCALE = 1.0;

interface SettingsShellProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * A calm settings section, presented as a single sheet of paper.
 * Icon + serif title + quiet description, then the section body with room to breathe.
 */
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card
      className={cn(
        "p-6 sm:p-8",
        tone === "danger" && "border-destructive/25 bg-destructive/[0.03]",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            tone === "danger"
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-accent/25 bg-accent/10 text-accent",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2
            className={cn("text-h3", tone === "danger" && "text-destructive")}
          >
            {title}
          </h2>
          <p className="text-body-small text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-7">{children}</div>
    </Card>
  );
}

export function SettingsShell({ initialUser }: SettingsShellProps) {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = React.useState(initialUser);

  // Profile Form States
  const [profileName, setProfileName] = React.useState(user.name);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Paper Feel Calibration States. Storage-backed values sync in an effect so
  // the hydration render matches the server HTML.
  const [paperScale, setPaperScale] = React.useState<number>(INITIAL_SCALE);
  const [diagonalInches, setDiagonalInches] = React.useState("");
  const [resolutionWidth, setResolutionWidth] = React.useState("");
  const [resolutionHeight, setResolutionHeight] = React.useState("");
  const [isCalibratingCard, setIsCalibratingCard] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = React.useState(1);

  // Security (Password) Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  // Connected Accounts
  const [accounts, setAccounts] = React.useState<{ provider: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(true);

  // Danger Zone modal
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deletePassword, setDeletePassword] = React.useState("");
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const deleteModalRef = useFocusTrap(showDeleteModal);

  // Diary Lock States. The lock is per-device and defaults to OFF on a new
  // device: the device's own `withink_lock_enabled` flag (falling back to the
  // presence of a bound PIN key) is the source of truth, not the account state.
  // Both flags sync in an effect (hydration-stable), never during render.
  const [diaryLockEnabled, setDiaryLockEnabled] = React.useState(false);
  const [deviceHasPin, setDeviceHasPin] = React.useState(false);
  React.useEffect(() => {
    const flag = safeStorage.getItem("withink_lock_enabled");
    if (flag !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiaryLockEnabled(flag === "true");
    } else {
      setDiaryLockEnabled(
        !!safeStorage.getItem("withink_encrypted_master_key"),
      );
    }
    setDeviceHasPin(!!safeStorage.getItem("withink_encrypted_master_key"));
  }, []);
  const [diaryLockTimeout, setDiaryLockTimeout] = React.useState(300);
  const [diaryLockOnTabHide, setDiaryLockOnTabHide] = React.useState(false);
  const [diaryHasPasscode, setDiaryHasPasscode] = React.useState(false);
  const [isSavingLockSettings, setIsSavingLockSettings] = React.useState(false);
  const [lockSettingsLoading, setLockSettingsLoading] = React.useState(true);
  const [showSetupModal, setShowSetupModal] = React.useState(false);
  const [showChangeModal, setShowChangeModal] = React.useState(false);

  // Zero-Knowledge Encryption States
  const {
    isClientEncrypted,
    masterKey,
    setEncryptionSettings,
    setMasterKey,
    encryptionSalt,
    verificationCiphertext,
    clearLocalMasterKey,
  } = useEncryption();

  const [zkPassword, setZkPassword] = React.useState("");
  const [zkPasswordConfirm, setZkPasswordConfirm] = React.useState("");
  const [zkPINConfirm, setZkPINConfirm] = React.useState("");
  const [zkWarningChecked, setZkWarningChecked] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [showZKSetupModal, setShowZKSetupModal] = React.useState(false);

  const [zkOldPassword, setZkOldPassword] = React.useState("");
  const [zkNewPassword, setZkNewPassword] = React.useState("");
  const [zkNewPasswordConfirm, setZkNewPasswordConfirm] = React.useState("");
  const [isChangingZKPassword, setIsChangingZKPassword] = React.useState(false);
  const [showZKChangeModal, setShowZKChangeModal] = React.useState(false);

  const zkSetupModalRef = useFocusTrap(showZKSetupModal);
  const zkChangeModalRef = useFocusTrap(showZKChangeModal);

  // Close the ZK modals on Escape (unless a submission is in flight).
  React.useEffect(() => {
    if (!showZKSetupModal && !showZKChangeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showZKSetupModal && !isMigrating) setShowZKSetupModal(false);
      if (showZKChangeModal && !isChangingZKPassword)
        setShowZKChangeModal(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showZKSetupModal, showZKChangeModal, isMigrating, isChangingZKPassword]);

  React.useEffect(() => {
    getLockSettingsAction()
      .then((res) => {
        if (res.success && res.data) {
          // `diaryLockEnabled` intentionally comes from the device flag (it
          // defaults OFF on a new device), not the account-level value — so a
          // returning user's account lock state doesn't flip a fresh device on.
          setDiaryLockTimeout(res.data.autoLockTimeout);
          setDiaryLockOnTabHide(res.data.lockOnTabHide);
          setDiaryHasPasscode(res.data.hasPasscode);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLockSettingsLoading(false);
      });
  }, []);

  const handleToggleDiaryLock = (enabled: boolean) => {
    // Enabling the lock always requires a PIN: open the setup modal unless a
    // PIN is already bound on THIS device (otherwise the user would "enable"
    // the lock and be shown "Change PIN" with no PIN set).
    if (enabled && !deviceHasPin) {
      setShowSetupModal(true);
    } else {
      setDiaryLockEnabled(enabled);
    }
  };

  const handleSaveDiaryLock = async () => {
    setIsSavingLockSettings(true);
    const toastId = toast.loading("Updating lock settings...");

    // Enabling/re-enabling without a new passcode and disabling are
    // privileged transitions server-side: they require proof of knowledge of
    // a secret. The diary is always unlocked in Settings, so the master key
    // is in memory and the unlock proof can be attached silently — no extra
    // prompt for the user.
    let unlockProof: string | undefined;
    if (masterKey) {
      try {
        unlockProof = await deriveUnlockProofHex(masterKey);
      } catch {
        // Fall back to letting the server return its error message.
      }
    }

    const res = await saveLockSettingsAction({
      isLockEnabled: diaryLockEnabled,
      autoLockTimeout: diaryLockTimeout,
      lockOnTabHide: diaryLockOnTabHide,
      ...(unlockProof ? { unlockProof } : {}),
    });

    if (res.success) {
      toast.success("Diary lock settings updated", { id: toastId });
      setDiaryHasPasscode(diaryLockEnabled && diaryHasPasscode);
      safeStorage.setItem("withink_lock_enabled", String(diaryLockEnabled));

      if (!diaryLockEnabled) {
        safeStorage.removeItem("withink_encrypted_master_key");
      }
      safeStorage.removeItem("withink_master_key");
      safeStorage.removeSessionItem("withink_master_key");
    } else {
      toast.error(res.error || "Failed to update lock settings", {
        id: toastId,
      });
    }
    setIsSavingLockSettings(false);
  };

  // Close Delete confirmation modal on Escape
  React.useEffect(() => {
    if (!showDeleteModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeletingAccount) {
        setShowDeleteModal(false);
        setDeleteConfirmText("");
        setDeletePassword("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal, isDeletingAccount]);

  // Fetch connected accounts
  React.useEffect(() => {
    authClient
      .listAccounts()
      .then((res) => {
        if (res && Array.isArray(res)) {
          setAccounts(res);
        }
      })
      .catch(() => {
        setAccounts([]);
      })
      .finally(() => {
        setAccountsLoading(false);
      });
  }, []);

  // Load the stored paper scale before the persist effect below is allowed to
  // write — otherwise mounting would clobber the saved value with the default.
  const [paperScaleLoaded, setPaperScaleLoaded] = React.useState(false);
  React.useEffect(() => {
    const stored = safeStorage.getItem(PAPER_SCALE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!Number.isNaN(parsed)) setPaperScale(parsed);
    }
    setPaperScaleLoaded(true);
  }, []);

  // Handle Paper Scale updates
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      "--withink-paper-scale",
      paperScale.toString(),
    );
    if (paperScaleLoaded) {
      safeStorage.setItem(PAPER_SCALE_KEY, paperScale.toString());
    }
  }, [paperScale, paperScaleLoaded]);

  // Profile Upload Handler
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;

      // Limit size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar image size must be under 5MB");
        return;
      }

      setAvatarUploading(true);
      const toastId = toast.loading("Uploading avatar...");

      try {
        // 1. Fetch Presigned URL
        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            folder: "avatar",
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to generate upload URL");
        }

        const { presignedUrl, publicUrl } = await res.json();

        // 2. PUT file to R2
        const putRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!putRes.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // 3. Update User Profile in Better Auth
        const updateRes = await authClient.updateUser({
          image: publicUrl,
        });

        if (updateRes.error) {
          throw new Error(updateRes.error.message || "Failed to sync profile");
        }

        setUser((prev) => ({ ...prev, image: publicUrl }));
        toast.success("Avatar updated successfully", { id: toastId });
      } catch (err: any) {
        toast.error(err.message || "Failed to upload avatar", { id: toastId });
      } finally {
        setAvatarUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Save Profile Name
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    const toastId = toast.loading("Updating profile details...");

    try {
      const res = await authClient.updateUser({
        name: profileName,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setUser((prev) => ({ ...prev, name: profileName }));
      toast.success("Profile updated", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile", { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Paper Feel helpers
  const handlePaperScaleReset = () => {
    setPaperScale(INITIAL_SCALE);
    setDiagonalInches("");
    setResolutionWidth("");
    setResolutionHeight("");
    setIsCalibratingCard(false);
    setCardScale(1);
    toast.info("Paper scale reset to default");
  };

  const handleAutoDetectDevice = () => {
    const width = window.screen.width;
    const height = window.screen.height;
    const diagonalPx = Math.sqrt(width * width + height * height);

    let detectedScale = 1.0;
    if (diagonalPx > 2200) detectedScale = 0.9;
    else if (diagonalPx > 1800) detectedScale = 0.95;
    else if (diagonalPx > 1400) detectedScale = 1.0;
    else if (diagonalPx > 1000) detectedScale = 1.05;
    else detectedScale = 1.1;

    setPaperScale(detectedScale);
    toast.success(`Visual scale set to ${detectedScale.toFixed(2)}x`);
  };

  const handleScreenDiagonalCalibrate = () => {
    const d = parseFloat(diagonalInches);
    const w = parseInt(resolutionWidth);
    const h = parseInt(resolutionHeight);

    if (isNaN(d) || isNaN(w) || isNaN(h) || d <= 0 || w <= 0 || h <= 0) {
      toast.error("Please enter valid positive numbers");
      return;
    }

    const ppi = Math.sqrt(w * w + h * h) / d;

    let calibratedScale = 1.0;
    if (ppi > 220) calibratedScale = 0.85;
    else if (ppi > 180) calibratedScale = 0.9;
    else if (ppi > 140) calibratedScale = 0.95;
    else if (ppi > 100) calibratedScale = 1.0;
    else calibratedScale = 1.1;

    setPaperScale(calibratedScale);
    toast.success(
      `PPI Calibrated: ${calibratedScale.toFixed(2)}x (${ppi.toFixed(0)} PPI)`,
    );
  };

  // Card calibration dragging mouse & touch support
  const handleCardDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCalibratingCard || !cardRef.current) return;
    e.preventDefault();

    const clientX =
      "touches" in e && e.touches && e.touches[0]
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const startX = clientX;
    const startWidth = cardRef.current.offsetWidth;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX =
        "touches" in moveEvent && moveEvent.touches && moveEvent.touches[0]
          ? moveEvent.touches[0].clientX
          : (moveEvent as MouseEvent).clientX;
      const newWidth = startWidth + (currentX - startX);
      const pxPerMm = 96 / 25.4; // 96 px per inch, 25.4 mm per inch
      const standardWidthPx = 85.6 * pxPerMm; // standard credit card size (85.6mm)
      const scale = newWidth > 0 ? newWidth / standardWidthPx : 0.001;
      setCardScale(Math.max(0.1, scale));
    };

    const onEnd = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  };

  const handleCompleteCardCalibration = () => {
    setIsCalibratingCard(false);
    if (cardScale <= 0) {
      toast.error("Calibration failed, invalid card size");
      setCardScale(1);
      return;
    }

    const calibratedPaperScale = Math.max(
      0.8,
      Math.min(1.2, (1 / cardScale) * 0.95),
    );
    setPaperScale(Number(calibratedPaperScale.toFixed(2)));
    toast.success(
      `Card calibration applied: ${calibratedPaperScale.toFixed(2)}x`,
    );
  };

  // Zero-Knowledge Encryption Actions
  const handleMigrate = async () => {
    if (zkPassword !== zkPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!zkWarningChecked) {
      toast.error("Please confirm the data recovery warning");
      return;
    }
    if (diaryLockEnabled && diaryHasPasscode && !zkPINConfirm) {
      toast.error("Please enter your current 4-digit PIN");
      return;
    }

    setIsMigrating(true);
    const toastId = toast.loading("Starting zero-knowledge migration...");

    try {
      // 1. Fetch plaintext entries from the server
      toast.loading("Fetching journal entries...", { id: toastId });
      const fetchRes = await getPlaintextEntriesForMigrationAction();
      if (!fetchRes.success || !fetchRes.entries) {
        throw new Error(fetchRes.error || "Failed to fetch entries");
      }

      const entries = fetchRes.entries;

      // 2. Generate random 16-byte salt and derive password key client-side
      toast.loading("Deriving encryption keys...", { id: toastId });
      const salt = generateRandomSalt();
      const passwordKey = await deriveKeyFromPasswordAsync(zkPassword, salt);

      // 3. Generate a secure random master key client-side
      const newMasterKey = await generateMasterKey();
      const masterKeyHex = await exportKeyToHex(newMasterKey);

      // 4. Encrypt the master key with the password key
      const verificationCiphertext = await encryptText(
        masterKeyHex,
        passwordKey,
      );

      // 5. Encrypt all entry texts client-side
      toast.loading(`Encrypting ${entries.length} entries...`, { id: toastId });
      const encryptedEntries = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;

        // Encrypt fields using the master key
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

        // Count words
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

      // 6. Submit to the server. Bind the unlock proof so the lock's unlock
      // cookie can only be minted with possession of this master key.
      toast.loading("Saving secure database records...", { id: toastId });
      const unlockProof = await deriveUnlockProofHex(newMasterKey);
      const enableRes = await enableClientEncryptionAction(
        salt,
        verificationCiphertext,
        encryptedEntries,
        unlockProof,
      );
      if (!enableRes.success) {
        throw new Error(
          enableRes.error || "Failed to enable client encryption",
        );
      }

      // 7. If PIN lock is enabled, encrypt the master key with the PIN key
      if (diaryLockEnabled && diaryHasPasscode && zkPINConfirm) {
        const pinKey = await deriveKeyFromPasswordAsync(
          zkPINConfirm,
          salt,
          50000,
        );
        const encryptedMasterKey = await encryptText(masterKeyHex, pinKey);
        safeStorage.setItem("withink_encrypted_master_key", encryptedMasterKey);
      } else {
        safeStorage.removeItem("withink_encrypted_master_key");
      }

      // Plaintext key caching is removed.
      safeStorage.removeItem("withink_master_key");
      safeStorage.removeSessionItem("withink_master_key");

      // 8. Update local context
      setEncryptionSettings({
        isClientEncrypted: true,
        encryptionSalt: salt,
        verificationCiphertext,
      });
      setMasterKey(newMasterKey);

      toast.success("Diary Zero-Knowledge Encryption activated!", {
        id: toastId,
      });
      setShowZKSetupModal(false);
      setZkPassword("");
      setZkPasswordConfirm("");
      setZkPINConfirm("");
      setZkWarningChecked(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to migrate to zero-knowledge", {
        id: toastId,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleChangeZKPassword = async () => {
    if (zkNewPassword !== zkNewPasswordConfirm) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingZKPassword(true);
    const toastId = toast.loading("Updating Diary Password...");

    try {
      // 1. Derive key from old password
      const oldPasswordKey = await deriveKeyFromPasswordAsync(
        zkOldPassword,
        encryptionSalt,
      );

      // 2. Decrypt verificationCiphertext to get master key hex
      let masterKeyHex;
      try {
        masterKeyHex = await decryptText(
          verificationCiphertext,
          oldPasswordKey,
        );
      } catch {
        throw new Error("Incorrect current Diary Password");
      }

      // 3. Derive key from new password using the same salt
      const newPasswordKey = await deriveKeyFromPasswordAsync(
        zkNewPassword,
        encryptionSalt,
      );

      // 4. Encrypt master key hex with new password key
      const newVerificationCiphertext = await encryptText(
        masterKeyHex,
        newPasswordKey,
      );

      // 5. Update server
      const res = await updateDiaryPasswordAction(newVerificationCiphertext);
      if (!res.success) {
        throw new Error(res.error || "Failed to update settings on server");
      }

      // 6. Update local context
      setEncryptionSettings({
        isClientEncrypted: true,
        encryptionSalt,
        verificationCiphertext: newVerificationCiphertext,
      });

      // Invalidate local encrypted master key on all other devices
      clearLocalMasterKey();

      toast.success("Diary Password updated successfully!", {
        id: toastId,
      });
      setShowZKChangeModal(false);
      setZkOldPassword("");
      setZkNewPassword("");
      setZkNewPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password", { id: toastId });
    } finally {
      setIsChangingZKPassword(false);
    }
  };

  // Security Form Submission
  const onSavePassword = async (data: PasswordFormValues) => {
    const res = await authClient.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: true,
    });

    if (res.error) {
      toast.error(res.error.message || "Failed to update password");
    } else {
      toast.success("Password changed successfully");
      reset();
    }
  };

  // Danger Zone - Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    // Credential accounts must re-enter their password (server-enforced);
    // OAuth-only accounts have no password and skip this.
    const hasCredentialAccount = accounts.some(
      (a) => a.provider === "credential",
    );
    if (hasCredentialAccount && !deletePassword.trim()) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setIsDeletingAccount(true);
    const toastId = toast.loading("Deconstructing your diary...");

    try {
      const res = await deleteAccountAction(
        hasCredentialAccount ? deletePassword : undefined,
      );
      if (!res.success) {
        throw new Error(res.error || "Failed to delete account");
      }

      toast.success("Diary dissolved successfully", { id: toastId });
      await clearSwCaches();
      clearSessionCookies();
      await authClient.signOut();
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", {
        id: toastId,
      });
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      clearSessionCookies();
      await clearSwCaches();
      toast.success("Logged out of your diary");
      window.location.href = "/login";
    } catch {
      toast.error("Sign out failed");
    }
  };

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "W";

  // Check if user is linked with Google
  const isGoogleLinked =
    accounts.some((acc) => acc.provider === "google") ||
    user.image?.includes("googleusercontent");

  const themeOptions = [
    {
      id: "light",
      name: "Desk",
      desc: "Manila paper by day",
      icon: Sun,
      swatch: "bg-[#EADFC7]",
      ink: "bg-[#3A2D1D]",
    },
    {
      id: "dark",
      name: "Dusk",
      desc: "Low-strain umber by night",
      icon: Moon,
      swatch: "bg-[#33291C]",
      ink: "bg-[#EADFC7]",
    },
  ] as const;

  return (
    <div className="animate-in fade-in w-full space-y-6 duration-300">
      {/* ==================== Profile ==================== */}
      <SettingsSection
        icon={User}
        title="Profile"
        description="Your name and photo, as they appear across your diary."
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={avatarUploading}
            />
            <button
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="border-border bg-secondary/60 focus-visible:ring-ring group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border shadow-sm transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  fill
                  sizes="80px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground font-serif text-2xl font-semibold">
                  {userInitials}
                </span>
              )}
              <span className="bg-foreground/45 text-background absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                {avatarUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </span>
            </button>
          </div>

          <div className="w-full flex-1 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="display-name"
                className="text-body-small text-foreground font-medium"
              >
                Display name
              </label>
              <Input
                id="display-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-body-small text-foreground font-medium">
                Email
              </label>
              <div className="border-border bg-secondary/40 text-body-small text-muted-foreground flex h-11 items-center rounded-lg border px-4">
                {user.email}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || profileName.trim() === user.name}
                className="px-6"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ==================== Appearance ==================== */}
      <SettingsSection
        icon={Palette}
        title="Appearance"
        description="Choose the light that suits your reflections."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {themeOptions.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  active
                    ? "border-accent bg-accent/5 ring-accent/30 ring-1"
                    : "border-border hover:border-accent/50 hover:bg-secondary/40",
                )}
              >
                <div
                  className={cn(
                    "border-border/60 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border",
                    t.swatch,
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full", t.ink)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <t.icon className="text-muted-foreground h-4 w-4" />
                    <span className="text-title font-semibold">{t.name}</span>
                  </div>
                  <p className="text-caption">{t.desc}</p>
                </div>
                {active && (
                  <span className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* ==================== Paper Feel ==================== */}
      <SettingsSection
        icon={Ruler}
        title="Paper feel"
        description="Tune the size of type and margins so writing feels natural on your screen."
      >
        <div className="space-y-6">
          {/* Slider */}
          <div className="border-border bg-secondary/30 space-y-4 rounded-xl border p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-body-small text-foreground font-medium">
                Visual scale
              </span>
              <span className="text-foreground font-serif text-2xl">
                {paperScale.toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.01"
              value={paperScale}
              onChange={(e) => setPaperScale(parseFloat(e.target.value))}
              aria-label="Visual scale"
              className="bg-border accent-primary focus-visible:ring-ring h-1.5 w-full cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-caption">Smaller · 0.8×</span>
              <span className="text-caption">1.2× · Larger</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaperScaleReset}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoDetectDevice}
                className="gap-2 px-6"
              >
                <MonitorSmartphone className="h-4 w-4" />
                Auto-detect device
              </Button>
            </div>
          </div>

          {/* Advanced calibrators */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Screen PPI Calculator */}
            <div className="border-border flex flex-col justify-between gap-4 rounded-xl border p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="text-muted-foreground h-4 w-4" />
                  <span className="text-body-small text-foreground font-medium">
                    Screen size
                  </span>
                </div>
                <p className="text-caption">
                  Enter your display details for a precise fit.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Diag in"
                    aria-label="Diagonal inches"
                    value={diagonalInches}
                    onChange={(e) => setDiagonalInches(e.target.value)}
                    className="h-10 px-2.5 text-center text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Width"
                    aria-label="Resolution width in pixels"
                    value={resolutionWidth}
                    onChange={(e) => setResolutionWidth(e.target.value)}
                    className="h-10 px-2.5 text-center text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Height"
                    aria-label="Resolution height in pixels"
                    value={resolutionHeight}
                    onChange={(e) => setResolutionHeight(e.target.value)}
                    className="h-10 px-2.5 text-center text-sm"
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleScreenDiagonalCalibrate}
                className="w-full"
              >
                Calculate
              </Button>
            </div>

            {/* Credit Card Drag */}
            <div className="border-border flex flex-col justify-between gap-4 rounded-xl border p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-muted-foreground h-4 w-4" />
                  <span className="text-body-small text-foreground font-medium">
                    Card match
                  </span>
                </div>
                <p className="text-caption">
                  Resize the outline to match a real bank card held to the
                  screen.
                </p>
                {isCalibratingCard && (
                  <div className="flex justify-center py-1">
                    <div
                      ref={cardRef}
                      className="border-accent/60 bg-accent/5 relative flex h-[46px] max-w-full cursor-ew-resize items-center justify-center rounded-md border border-dashed select-none"
                      style={{
                        width: `${Math.min(200, 85.6 * cardScale * (96 / 25.4))}px`,
                      }}
                      onMouseDown={handleCardDragStart}
                      onTouchStart={handleCardDragStart}
                    >
                      <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                        Drag edge →
                      </span>
                      <div className="bg-accent/25 absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize rounded-r-md" />
                    </div>
                  </div>
                )}
              </div>
              {!isCalibratingCard ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsCalibratingCard(true);
                    setCardScale(1.0);
                    toast.info("Drag the right edge to match your card.");
                  }}
                  className="w-full"
                >
                  Start matching
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCompleteCardCalibration}
                  className="w-full"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ==================== Security ==================== */}
      <SettingsSection
        icon={Lock}
        title="Security"
        description="Manage the password that protects your private entries."
      >
        {isGoogleLinked ? (
          <div className="border-border bg-secondary/40 flex items-start gap-3 rounded-xl border p-5">
            <span className="bg-accent/15 text-accent-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Check className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <p className="text-body-small text-foreground font-medium">
                Signed in with Google
              </p>
              <p className="text-caption">
                Your sign-in is handled securely by Google, so there is no
                password to change here.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSavePassword)} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="current-password"
                className="text-body-small text-foreground font-medium"
              >
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-caption text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="text-body-small text-foreground font-medium"
                >
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-caption text-destructive">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-body-small text-foreground font-medium"
                >
                  Confirm password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-caption text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="px-6">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update password
              </Button>
            </div>
          </form>
        )}
      </SettingsSection>

      {/* ==================== Diary Encryption ==================== */}
      <SettingsSection
        icon={Shield}
        title="Diary encryption (Zero-knowledge)"
        description="Secure your diary entries with client-side zero-knowledge encryption. Your data is encrypted before it leaves your device."
      >
        {isClientEncrypted ? (
          <div className="space-y-4">
            <div className="border-border bg-secondary/40 flex items-start gap-3 rounded-xl border p-5">
              <span className="bg-accent/15 text-accent-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <Check className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <p className="text-body-small text-foreground font-medium">
                  Zero-knowledge active
                </p>
                <p className="text-caption">
                  Your journal entries are encrypted directly on your device.
                  The server only sees encrypted blobs and has no access to your
                  logs.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowZKChangeModal(true)}
                className="px-6"
              >
                Change Diary Password
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-body-small text-muted-foreground">
              By default, entries are encrypted on our servers. Enable Diary
              Encryption to derive a unique decryption key in your browser. This
              will migrate all your existing entries to zero-knowledge.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowZKSetupModal(true)}
                className="px-6"
              >
                Enable zero-knowledge encryption
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ==================== Diary Lock ==================== */}
      <SettingsSection
        icon={Shield}
        title="Diary lock"
        description="Add a secondary layer of security to block access to your diary content, even if you are logged in."
      >
        {lockSettingsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enable lock toggle */}
            <div className="border-border bg-secondary/30 flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="text-body-small text-foreground font-medium">
                  Enable Diary Lock
                </p>
                <p className="text-caption">
                  Protect your journal with a 4-digit PIN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleDiaryLock(!diaryLockEnabled)}
                className={cn(
                  "focus:ring-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none",
                  diaryLockEnabled ? "bg-accent" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "bg-background pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
                    diaryLockEnabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {diaryLockEnabled && (
              <div className="animate-in slide-in-from-top-4 space-y-5 duration-200">
                {/* PIN Configuration Trigger — only when this device actually has a PIN bound */}
                {deviceHasPin && (
                  <div className="border-border bg-secondary/10 flex items-center justify-between gap-4 rounded-xl border p-4">
                    <div>
                      <p className="text-body-small text-foreground font-medium">
                        Passcode Lock
                      </p>
                      <p className="text-caption">
                        A secure 4-digit PIN is configured.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeModal(true)}
                    >
                      Change PIN
                    </Button>
                  </div>
                )}

                {/* Auto-Lock Inactivity Timeout */}
                <div className="space-y-2">
                  <label
                    htmlFor="lock-timeout"
                    className="text-body-small text-foreground font-medium"
                  >
                    Auto-lock timeout
                  </label>
                  <select
                    id="lock-timeout"
                    value={diaryLockTimeout}
                    onChange={(e) =>
                      setDiaryLockTimeout(Number(e.target.value))
                    }
                    className="border-border bg-background focus:ring-ring flex h-11 w-full max-w-[300px] rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  >
                    <option value={0}>Lock immediately</option>
                    <option value={60}>1 minute of inactivity</option>
                    <option value={300}>5 minutes of inactivity</option>
                    <option value={900}>15 minutes of inactivity</option>
                    <option value={1800}>30 minutes of inactivity</option>
                    <option value={-1}>Never lock on inactivity</option>
                  </select>
                </div>

                {/* Lock on Tab Hide */}
                <div className="border-border flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="text-body-small text-foreground font-medium">
                      Lock when switching tabs
                    </p>
                    <p className="text-caption">
                      Instantly lock the diary when the page is hidden or
                      minimized.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiaryLockOnTabHide(!diaryLockOnTabHide)}
                    className={cn(
                      "focus:ring-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none",
                      diaryLockOnTabHide ? "bg-accent" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "bg-background pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
                        diaryLockOnTabHide ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveDiaryLock}
                disabled={isSavingLockSettings}
                className="px-6"
              >
                {isSavingLockSettings && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save lock settings
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ==================== Connected Accounts ==================== */}
      <SettingsSection
        icon={LinkIcon}
        title="Connected accounts"
        description="The ways you can sign in to your diary."
      >
        {accountsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="divide-border border-border divide-y overflow-hidden rounded-xl border">
            {/* Google */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <div>
                  <p className="text-body-small text-foreground font-medium">
                    Google
                  </p>
                  <p className="text-caption">Single sign-on</p>
                </div>
              </div>
              <ConnectionBadge connected={!!isGoogleLinked} />
            </div>

            {/* Email & password */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground flex h-5 w-5 items-center justify-center">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-body-small text-foreground font-medium">
                    Email & password
                  </p>
                  <p className="text-caption">{user.email}</p>
                </div>
              </div>
              <ConnectionBadge connected={!isGoogleLinked} />
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ==================== Your data (Export) ==================== */}
      <DataExportCard />

      {/* ==================== Session ==================== */}
      <Card className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-1">
          <h2 className="text-title font-semibold">Sign out</h2>
          <p className="text-body-small text-muted-foreground">
            End this session on this device.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </Card>

      {/* ==================== Danger Zone ==================== */}
      <SettingsSection
        icon={AlertTriangle}
        title="Delete account"
        description="Permanently remove your account, journal entries, and uploaded media. This cannot be undone."
        tone="danger"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-body-small text-muted-foreground">
            Everything is erased from our servers, including encrypted entries
            and media.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </div>
      </SettingsSection>

      {/* ==================== CONFIRM ACCOUNT DELETION MODAL ==================== */}
      {showDeleteModal && (
        <div className="bg-foreground/50 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-200">
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!isDeletingAccount) {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
                setDeletePassword("");
              }
            }}
          />

          <Card
            ref={deleteModalRef as React.RefObject<HTMLDivElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            className="animate-in zoom-in-95 relative z-10 w-full max-w-md p-6 shadow-lg duration-200 sm:p-8"
          >
            <div className="space-y-3 text-center">
              <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 id="delete-dialog-title" className="text-h3 text-foreground">
                Delete your account?
              </h2>
              <p
                id="delete-dialog-description"
                className="text-body-small text-muted-foreground"
              >
                This permanently erases every entry and memory. To confirm, type{" "}
                <span className="text-foreground font-semibold">DELETE</span>{" "}
                below.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <Input
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={isDeletingAccount}
                autoFocus
                className="text-center tracking-widest"
              />
              {accounts.some((a) => a.provider === "credential") && (
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={isDeletingAccount}
                  autoComplete="current-password"
                />
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                    setDeletePassword("");
                  }}
                  disabled={isDeletingAccount}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                  className="flex-1 gap-2"
                >
                  {isDeletingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showSetupModal && (
        <LockSetupOnboarding
          onSetupSuccess={() => {
            setDiaryLockEnabled(true);
            setDiaryHasPasscode(true);
            setShowSetupModal(false);
            safeStorage.setItem("withink_lock_enabled", "true");
          }}
          onCancel={() => setShowSetupModal(false)}
        />
      )}

      {showChangeModal && (
        <LockChangeModal
          onClose={() => setShowChangeModal(false)}
          onSuccess={() => {
            setShowChangeModal(false);
          }}
        />
      )}

      {/* ==================== Diary Zero-Knowledge Setup Modal ==================== */}
      {showZKSetupModal && (
        <div
          ref={zkSetupModalRef as React.RefObject<HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zk-setup-title"
          className="bg-foreground/50 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-200"
        >
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => !isMigrating && setShowZKSetupModal(false)}
          />
          <Card className="animate-in zoom-in-95 relative z-10 w-full max-w-md p-6 shadow-lg duration-200 sm:p-8">
            <h2
              id="zk-setup-title"
              className="text-h3 text-foreground mb-4 font-serif"
            >
              Set up Diary Password
            </h2>
            <p className="text-caption text-muted-foreground mb-6">
              Establish a client-side decryption password. Your entries will be
              decrypted/encrypted locally.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="zk-setup-password"
                  className="text-body-small text-foreground font-medium"
                >
                  Diary Password
                </label>
                <Input
                  id="zk-setup-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={zkPassword}
                  onChange={(e) => setZkPassword(e.target.value)}
                  disabled={isMigrating}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="zk-setup-password-confirm"
                  className="text-body-small text-foreground font-medium"
                >
                  Confirm Password
                </label>
                <Input
                  id="zk-setup-password-confirm"
                  type="password"
                  placeholder="Confirm password"
                  value={zkPasswordConfirm}
                  onChange={(e) => setZkPasswordConfirm(e.target.value)}
                  disabled={isMigrating}
                />
              </div>

              {diaryLockEnabled && diaryHasPasscode && (
                <div className="space-y-2">
                  <label
                    htmlFor="zk-setup-pin"
                    className="text-body-small text-foreground font-medium"
                  >
                    Confirm 4-digit PIN
                  </label>
                  <Input
                    id="zk-setup-pin"
                    type="password"
                    maxLength={4}
                    placeholder="Enter PIN passcode"
                    value={zkPINConfirm}
                    onChange={(e) =>
                      setZkPINConfirm(e.target.value.replace(/\D/g, ""))
                    }
                    disabled={isMigrating}
                  />
                  <p className="text-muted-foreground text-[10px]">
                    Required to secure your local browser key with your passcode
                    lock.
                  </p>
                </div>
              )}

              <div className="border-accent/25 bg-accent/5 mt-2 flex items-start gap-2.5 rounded-xl border p-4">
                <input
                  type="checkbox"
                  id="zk-warning"
                  checked={zkWarningChecked}
                  onChange={(e) => setZkWarningChecked(e.target.checked)}
                  disabled={isMigrating}
                  className="border-border text-accent focus:ring-accent mt-0.5 h-4 w-4 rounded"
                />
                <label
                  htmlFor="zk-warning"
                  className="text-muted-foreground cursor-pointer text-[11px] leading-relaxed select-none"
                >
                  I understand my journal is 100% zero-knowledge. If I lose my
                  Diary Password, my data cannot be recovered by anyone.
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowZKSetupModal(false)}
                  disabled={isMigrating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMigrate}
                  disabled={
                    isMigrating ||
                    !zkPassword ||
                    !zkPasswordConfirm ||
                    !zkWarningChecked ||
                    (diaryLockEnabled && diaryHasPasscode && !zkPINConfirm)
                  }
                  className="flex-1 gap-2"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Migrating
                    </>
                  ) : (
                    "Migrate Journal"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== Diary Zero-Knowledge Password Change Modal ==================== */}
      {showZKChangeModal && (
        <div
          ref={zkChangeModalRef as React.RefObject<HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zk-change-title"
          className="bg-foreground/50 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-200"
        >
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => !isChangingZKPassword && setShowZKChangeModal(false)}
          />
          <Card className="animate-in zoom-in-95 relative z-10 w-full max-w-md p-6 shadow-lg duration-200 sm:p-8">
            <h2
              id="zk-change-title"
              className="text-h3 text-foreground mb-4 font-serif"
            >
              Change Diary Password
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="zk-current-password"
                  className="text-body-small text-foreground font-medium"
                >
                  Current Diary Password
                </label>
                <Input
                  id="zk-current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={zkOldPassword}
                  onChange={(e) => setZkOldPassword(e.target.value)}
                  disabled={isChangingZKPassword}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="zk-new-password"
                  className="text-body-small text-foreground font-medium"
                >
                  New Diary Password
                </label>
                <Input
                  id="zk-new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={zkNewPassword}
                  onChange={(e) => setZkNewPassword(e.target.value)}
                  disabled={isChangingZKPassword}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="zk-new-password-confirm"
                  className="text-body-small text-foreground font-medium"
                >
                  Confirm New Password
                </label>
                <Input
                  id="zk-new-password-confirm"
                  type="password"
                  placeholder="Confirm new password"
                  value={zkNewPasswordConfirm}
                  onChange={(e) => setZkNewPasswordConfirm(e.target.value)}
                  disabled={isChangingZKPassword}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowZKChangeModal(false)}
                  disabled={isChangingZKPassword}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangeZKPassword}
                  disabled={
                    isChangingZKPassword ||
                    !zkOldPassword ||
                    !zkNewPassword ||
                    !zkNewPasswordConfirm
                  }
                  className="flex-1 gap-2"
                >
                  {isChangingZKPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "text-caption inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium",
        connected
          ? "bg-accent/15 text-accent-foreground"
          : "bg-secondary text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-accent" : "bg-muted-foreground/50",
        )}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
