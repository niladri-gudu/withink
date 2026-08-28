"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Select } from "@withink/ui/select";
import { cn } from "@withink/utils";
import {
  AlertTriangle,
  Camera,
  Check,
  CreditCard,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Palette,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authClient, clearSessionCookies } from "@/lib/auth-client";
import { deriveUnlockProofHex } from "@/lib/crypto-client";
import { safeStorage } from "@/lib/safe-storage";
import { clearSwCaches } from "@/lib/sw-cache";
import { useEncryption } from "@/providers/encryption-provider";
import { BillingSection } from "@/features/billing/components/billing-section";
import type { ResolvedPlan } from "@/features/billing/config/plans";
import { ZkChangeDialog } from "@/features/encryption/components/zk-change-dialog";
import { ZkSetupDialog } from "@/features/encryption/components/zk-setup-dialog";
import { DataExportCard } from "@/features/export/components/data-export-card";
import {
  getLockSettingsAction,
  saveLockSettingsAction,
} from "@/features/lock/actions/lock-actions";
import { LockChangeDialog } from "@/features/lock/components/lock-change-dialog";
import { LockSetupOnboarding } from "@/features/lock/components/lock-setup-onboarding";
import { AppearanceSettings } from "@/features/settings/appearance/appearance-settings";
import { DeleteAccountDialog } from "@/features/settings/components/delete-account-dialog";
import { SettingsGroup } from "@/features/settings/components/settings-group";

const PAPER_SCALE_KEY = "withink-paper-scale";
const INITIAL_SCALE = 1.0;

interface SettingsShellProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  /** Server-resolved plan — gates curated appearance selection. */
  plan: ResolvedPlan;
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

/** Hairline divider between blocks living inside one group body. */
function GroupDivider() {
  return <div aria-hidden="true" className="border-border/40 my-7 border-t" />;
}

export function SettingsShell({ initialUser, plan }: SettingsShellProps) {
  const [user, setUser] = React.useState(initialUser);

  // ---- Profile -------------------------------------------------------------
  const [profileName, setProfileName] = React.useState(user.name);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ---- Paper feel ------------------------------------------------------------
  const [paperScale, setPaperScale] = React.useState<number>(INITIAL_SCALE);

  // Security (Password) Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  // ---- Privacy & security ---------------------------------------------------
  const { masterKey, isClientEncrypted } = useEncryption();

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
  const [showZKSetupModal, setShowZKSetupModal] = React.useState(false);
  const [showZKChangeModal, setShowZKChangeModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

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

  // ---- Your data -------------------------------------------------------------
  const [accounts, setAccounts] = React.useState<{ provider: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(true);

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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to upload avatar";
        toast.error(message, { id: toastId });
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message, { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Paper Feel helpers
  const handlePaperScaleReset = () => {
    setPaperScale(INITIAL_SCALE);
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

  const hasCredentialAccount = accounts.some(
    (a) => a.provider === "credential",
  );

  return (
    <div className="animate-in fade-in w-full space-y-6 duration-300">
      {/* ==================== Groups (ruled sections; collapsible on phones).
          Each section owns its own hairline divider + symmetric padding. ==== */}
      <div>
        {/* ---- Profile ---- */}
        <SettingsGroup
          icon={User}
          title="Profile"
          description="Your name and photo, as they appear across your diary."
          defaultOpen
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
                  autoComplete="name"
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
                  onClick={() => void handleSaveProfile()}
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
        </SettingsGroup>

        {/* ---- Appearance & Paper feel ---- */}
        <SettingsGroup
          icon={Palette}
          title="Appearance & paper feel"
          description="Choose your light and tune the size of type and margins."
        >
          <AppearanceSettings plan={plan} />

          <GroupDivider />

          {/* Paper feel */}
          <div className="space-y-6" role="group" aria-label="Paper feel">
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
          </div>
        </SettingsGroup>

        {/* ---- Privacy & security ---- */}
        <SettingsGroup
          icon={Shield}
          title="Privacy & security"
          description="Your sign-in password, zero-knowledge encryption, and Diary Lock."
        >
          {/* Sign-in password */}
          <div aria-label="Sign-in password">
            <h3 className="text-foreground mb-4 font-serif text-base font-semibold">
              Sign-in password
            </h3>
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
              <form
                onSubmit={handleSubmit(onSavePassword)}
                className="space-y-5"
              >
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
                    autoComplete="current-password"
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update password
                  </Button>
                </div>
              </form>
            )}
          </div>

          <GroupDivider />

          {/* Zero-knowledge encryption */}
          <div aria-label="Diary encryption">
            <h3 className="text-foreground mb-4 font-serif text-base font-semibold">
              Diary encryption (zero-knowledge)
            </h3>
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
                      Your journal entries are encrypted directly on your
                      device. The server only sees encrypted blobs and has no
                      access to your logs.
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
                  Encryption to derive a unique decryption key in your browser.
                  This will migrate all your existing entries to zero-knowledge.
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
          </div>

          <GroupDivider />

          {/* Diary lock */}
          <div aria-label="Diary lock">
            <h3 className="text-foreground mb-4 font-serif text-base font-semibold">
              Diary lock
            </h3>
            <p className="text-body-small text-muted-foreground -mt-2 mb-5">
              A secondary layer that blocks access to your content even while
              logged in.
            </p>
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
                    role="switch"
                    aria-checked={diaryLockEnabled}
                    aria-label="Enable Diary Lock"
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
                      <Select
                        id="lock-timeout"
                        value={diaryLockTimeout}
                        onChange={(e) =>
                          setDiaryLockTimeout(Number(e.target.value))
                        }
                        className="max-w-[300px]"
                      >
                        <option value={0}>Lock immediately</option>
                        <option value={60}>1 minute of inactivity</option>
                        <option value={300}>5 minutes of inactivity</option>
                        <option value={900}>15 minutes of inactivity</option>
                        <option value={1800}>30 minutes of inactivity</option>
                        <option value={-1}>Never lock on inactivity</option>
                      </Select>
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
                        role="switch"
                        aria-checked={diaryLockOnTabHide}
                        aria-label="Lock when switching tabs"
                        onClick={() =>
                          setDiaryLockOnTabHide(!diaryLockOnTabHide)
                        }
                        className={cn(
                          "focus:ring-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none",
                          diaryLockOnTabHide ? "bg-accent" : "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "bg-background pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
                            diaryLockOnTabHide
                              ? "translate-x-5"
                              : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => void handleSaveDiaryLock()}
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
          </div>
        </SettingsGroup>

        {/* ---- Your data ---- */}
        <SettingsGroup
          icon={LinkIcon}
          title="Your data"
          description="Export everything, review sign-in methods, or end this session."
        >
          <div aria-label="Connected accounts">
            <h3 className="text-foreground mb-4 font-serif text-base font-semibold">
              Connected accounts
            </h3>
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
                        Email &amp; password
                      </p>
                      <p className="text-caption">{user.email}</p>
                    </div>
                  </div>
                  <ConnectionBadge connected={!isGoogleLinked} />
                </div>
              </div>
            )}
          </div>

          <GroupDivider />

          {/* Export */}
          <div aria-label="Export">
            <DataExportCard />
          </div>

          <GroupDivider />

          {/* Session */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h3 className="text-foreground font-serif text-base font-semibold">
                Sign out
              </h3>
              <p className="text-body-small text-muted-foreground">
                End this session on this device.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void handleLogout()}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SettingsGroup>

        {/* ---- Plan & billing ---- */}
        <SettingsGroup
          icon={CreditCard}
          title="Plan & billing"
          description="Your plan, usage limits, and subscription management."
        >
          <BillingSection />
        </SettingsGroup>
      </div>

      {/* ==================== Danger zone — visually separated, always last ==================== */}
      <div
        className={cn(
          "border-destructive/25 bg-destructive/[0.03] mt-10 rounded-xl border p-6 sm:p-8",
        )}
      >
        <SettingsGroup
          icon={AlertTriangle}
          title="Delete account"
          description="Permanently remove your account, journal entries, and uploaded media. This cannot be undone."
          tone="danger"
          defaultOpen
        >
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-body-small text-muted-foreground">
              Everything is erased from our servers, including encrypted entries
              and media.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </Button>
          </div>
        </SettingsGroup>
      </div>

      {/* ==================== Migrated dialogs (Phase-1 primitives) ==================== */}
      <DeleteAccountDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        hasCredentialAccount={hasCredentialAccount}
      />

      {showSetupModal && (
        <LockSetupOnboarding
          variant="dialog"
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
        <LockChangeDialog
          onClose={() => setShowChangeModal(false)}
          onSuccess={() => {
            setShowChangeModal(false);
          }}
        />
      )}

      <ZkSetupDialog
        open={showZKSetupModal}
        onOpenChange={setShowZKSetupModal}
        diaryLockEnabled={diaryLockEnabled}
        diaryHasPasscode={diaryHasPasscode}
      />

      <ZkChangeDialog
        open={showZKChangeModal}
        onOpenChange={setShowZKChangeModal}
      />
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
