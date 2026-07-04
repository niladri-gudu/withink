/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "next-themes";
import {
  User,
  Palette,
  Ruler,
  Lock,
  Link as LinkIcon,
  Trash2,
  Camera,
  Loader2,
  Check,
  AlertTriangle,
  CreditCard,
  MonitorSmartphone,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { DataExportCard } from "@/features/export/components/data-export-card";
import { deleteAccountAction } from "../actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
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
              : "border-border bg-secondary/60 text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2
            className={cn(
              "text-h3",
              tone === "danger" && "text-destructive",
            )}
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

  // Paper Feel Calibration States
  const [paperScale, setPaperScale] = React.useState<number>(() => {
    if (typeof window === "undefined") return INITIAL_SCALE;
    const stored = localStorage.getItem(PAPER_SCALE_KEY);
    return stored ? parseFloat(stored) : INITIAL_SCALE;
  });
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
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

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

  // Handle Paper Scale updates
  React.useEffect(() => {
    document.documentElement.style.setProperty("--withink-paper-scale", paperScale.toString());
    localStorage.setItem(PAPER_SCALE_KEY, paperScale.toString());
  }, [paperScale]);

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
    toast.success(`PPI Calibrated: ${calibratedScale.toFixed(2)}x (${ppi.toFixed(0)} PPI)`);
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

    const calibratedPaperScale = Math.max(0.8, Math.min(1.2, (1 / cardScale) * 0.95));
    setPaperScale(Number(calibratedPaperScale.toFixed(2)));
    toast.success(`Card calibration applied: ${calibratedPaperScale.toFixed(2)}x`);
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

    setIsDeletingAccount(true);
    const toastId = toast.loading("Deconstructing your sanctuary...");

    try {
      const res = await deleteAccountAction();
      if (!res.success) {
        throw new Error(res.error || "Failed to delete account");
      }

      toast.success("Sanctuary dissolved successfully", { id: toastId });
      await authClient.signOut();
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: toastId });
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Logged out of your sanctuary");
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
      name: "Sand",
      desc: "Warm daylight paper",
      icon: Sun,
      swatch: "bg-[#FAF7F2]",
      ink: "bg-[#2C1A0E]",
    },
    {
      id: "dark",
      name: "Moon",
      desc: "Low-strain night reading",
      icon: Moon,
      swatch: "bg-[#0B0B0C]",
      ink: "bg-[#F4F4F5]",
    },
  ] as const;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* ==================== Profile ==================== */}
      <SettingsSection
        icon={User}
        title="Profile"
        description="Your name and photo, as they appear across your sanctuary."
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
              className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/60 shadow-sm transition-transform active:scale-95"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-serif text-2xl font-semibold text-muted-foreground">
                  {userInitials}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-background opacity-0 transition-opacity group-hover:opacity-100">
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
              <label htmlFor="display-name" className="text-body-small font-medium text-foreground">
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
              <label className="text-body-small font-medium text-foreground">Email</label>
              <div className="flex h-11 items-center rounded-lg border border-border bg-secondary/40 px-4 text-body-small text-muted-foreground">
                {user.email}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || profileName.trim() === user.name}
                className="rounded-full px-6"
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
                  "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                  active
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-border hover:border-accent/50 hover:bg-secondary/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/60",
                    t.swatch,
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full", t.ink)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <t.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-title font-semibold">{t.name}</span>
                  </div>
                  <p className="text-caption">{t.desc}</p>
                </div>
                {active && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
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
          <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-body-small font-medium text-foreground">Visual scale</span>
              <span className="font-serif text-2xl text-foreground">{paperScale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.01"
              value={paperScale}
              onChange={(e) => setPaperScale(parseFloat(e.target.value))}
              aria-label="Visual scale"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between">
              <span className="text-caption">Smaller · 0.8×</span>
              <span className="text-caption">1.2× · Larger</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handlePaperScaleReset} className="rounded-full">
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoDetectDevice}
                className="rounded-full gap-2"
              >
                <MonitorSmartphone className="h-4 w-4" />
                Auto-detect device
              </Button>
            </div>
          </div>

          {/* Advanced calibrators */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Screen PPI Calculator */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-border p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body-small font-medium text-foreground">Screen size</span>
                </div>
                <p className="text-caption">Enter your display details for a precise fit.</p>
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
                className="w-full rounded-full"
              >
                Calculate
              </Button>
            </div>

            {/* Credit Card Drag */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-border p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body-small font-medium text-foreground">Card match</span>
                </div>
                <p className="text-caption">
                  Resize the outline to match a real bank card held to the screen.
                </p>
                {isCalibratingCard && (
                  <div className="flex justify-center py-1">
                    <div
                      ref={cardRef}
                      className="relative flex h-[46px] max-w-full cursor-ew-resize select-none items-center justify-center rounded-md border border-dashed border-accent/60 bg-accent/5"
                      style={{
                        width: `${Math.min(200, 85.6 * cardScale * (96 / 25.4))}px`,
                      }}
                      onMouseDown={handleCardDragStart}
                      onTouchStart={handleCardDragStart}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Drag edge →
                      </span>
                      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-r-md bg-accent/25" />
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
                  className="w-full rounded-full"
                >
                  Start matching
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCompleteCardCalibration}
                  className="w-full rounded-full"
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
          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <Check className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <p className="text-body-small font-medium text-foreground">Signed in with Google</p>
              <p className="text-caption">
                Your sign-in is handled securely by Google, so there is no password to change here.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSavePassword)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-body-small font-medium text-foreground">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-caption text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-body-small font-medium text-foreground">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-caption text-destructive">{errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-body-small font-medium text-foreground"
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
                  <p className="text-caption text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="rounded-full px-6">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        )}
      </SettingsSection>

      {/* ==================== Connected Accounts ==================== */}
      <SettingsSection
        icon={LinkIcon}
        title="Connected accounts"
        description="The ways you can sign in to your sanctuary."
      >
        {accountsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {/* Google */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.google.com/favicon.ico" alt="" className="h-5 w-5" />
                <div>
                  <p className="text-body-small font-medium text-foreground">Google</p>
                  <p className="text-caption">Single sign-on</p>
                </div>
              </div>
              <ConnectionBadge connected={!!isGoogleLinked} />
            </div>

            {/* Email & password */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-body-small font-medium text-foreground">Email & password</p>
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
        <Button variant="outline" onClick={handleLogout} className="rounded-full gap-2">
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
            Everything is erased from our servers, including encrypted entries and media.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            className="rounded-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </div>
      </SettingsSection>

      {/* ==================== CONFIRM ACCOUNT DELETION MODAL ==================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!isDeletingAccount) {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }
            }}
          />

          <Card className="relative z-10 w-full max-w-md p-6 shadow-lg sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-h3 text-foreground">Delete your account?</h2>
              <p className="text-body-small text-muted-foreground">
                This permanently erases every entry and memory. To confirm, type{" "}
                <span className="font-semibold text-foreground">DELETE</span> below.
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
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeletingAccount}
                  className="flex-1 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                  className="flex-1 rounded-full gap-2"
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
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium",
        connected
          ? "bg-accent/15 text-accent-foreground"
          : "bg-secondary text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-accent" : "bg-muted-foreground/50",
        )}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
