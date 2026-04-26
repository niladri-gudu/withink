/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User,
  Palette,
  ShieldCheck,
  LogOut,
  Trash2,
  Check,
  Database,
  Image as ImageIcon,
  ExternalLink,
  HardDrive,
  KeyRound,
  UserMinus,
  Save,
  Camera,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, updateUser } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { getAvatarPresignedUrl, getStorageStats } from "@/app/actions/storage";
import Image from "next/image";
import { toast } from "sonner";
import Cropper from "react-easy-crop";

type TabType = "profile" | "appearance" | "data";

type StorageFile = {
  key: string | undefined;
  url: string;
};

type StorageStats = {
  usedMB: number;
  limitMB: number;
  fileCount: number;
  files: StorageFile[];
};

interface SettingsModalProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({
  user,
  open,
  onOpenChange,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<TabType>("profile");
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 📝 Profile & Avatar State
  const [name, setName] = React.useState(user?.name || "");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // 📸 Avatar & Cropping State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null);
  const [showCropper, setShowCropper] = React.useState(false);

  // 🚀 Local Preview States (The Fix for visual updates)
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = React.useState<Blob | null>(null);

  // 📊 Storage Stats
  const [stats, setStats] = React.useState<StorageStats>({
    usedMB: 0,
    limitMB: 50,
    fileCount: 0,
    files: [],
  });
  const [loading, setLoading] = React.useState(false);

  // 🛠️ Camera Trigger
  const onCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle File Selection
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = URL.createObjectURL(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
    }
  };

  // 🛠️ Canvas logic to generate the local preview thumbnail
  const generatePreview = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const image = new window.Image();
      image.src = imageSrc;
      await new Promise((resolve) => (image.onload = resolve));

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCroppedBlob(blob);
            const previewUrl = URL.createObjectURL(blob);
            setLocalPreview(previewUrl);
            setShowCropper(false);
          }
        },
        "image/jpeg",
        0.9,
      );
    } catch (e) {
      console.error("Failed to generate preview", e);
      toast.error("Failed to process image crop.");
    }
  };

  // 💾 Save Profile: Uploads to R2 if blob exists, then updates metadata
  const handleSaveProfile = async () => {
    setIsUpdating(true);
    const toastId = toast.loading("Syncing sanctuary profile...");
    try {
      let finalImageUrl = user.image;

      if (croppedBlob) {
        const { uploadUrl, publicUrl } = await getAvatarPresignedUrl(
          user.id,
          "image/jpeg",
        );
        await fetch(uploadUrl, {
          method: "PUT",
          body: croppedBlob,
          headers: { "Content-Type": "image/jpeg" },
        });
        finalImageUrl = publicUrl;
      }

      await updateUser({ name, image: finalImageUrl });
      toast.success("Profile updated successfully", { id: toastId });

      // Reset local states
      setLocalPreview(null);
      setCroppedBlob(null);
      setImageSrc(null);
    } catch (err: any) {
      toast.error(err.message || "Update failed", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(user?.name || "");
      setLocalPreview(null);
      setCroppedBlob(null);
    }
    onOpenChange(nextOpen);
  };

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "data" && user?.id) {
      setLoading(true);
      try {
        const data = await getStorageStats(user.id);
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!mounted) return null;

  // 🚀 Fallback Hierarchy: New Crop -> Database/Google -> Fallback Icon
  const currentDisplayImage = localPreview || user?.image;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenStateChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-180 h-[85vh] sm:h-135 p-0 gap-0 border-border/40 bg-background/95 backdrop-blur-xl rounded-3xl sm:rounded-4xl overflow-hidden shadow-2xl flex flex-col sm:flex-row">
          <div className="sr-only">
            <DialogTitle>Sanctuary Settings</DialogTitle>
            <DialogDescription>
              Manage your identity and archives.
            </DialogDescription>
          </div>

          {/* 🏛️ Sidebar */}
          <div className="w-full sm:w-52.5 border-b sm:border-b-0 sm:border-r border-border/20 bg-secondary/10 p-3 sm:p-4 flex flex-row sm:flex-col justify-between items-center sm:items-stretch shrink-0">
            <div className="flex flex-row sm:flex-col items-center sm:items-stretch w-full gap-2 sm:gap-1 overflow-x-auto no-scrollbar">
              <div className="hidden sm:block px-3 py-4 mb-2 text-center">
                <span className="text-xl font-black tracking-tighter italic text-foreground">
                  withink.
                </span>
              </div>
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "appearance", label: "Appearance", icon: Palette },
                { id: "data", label: "Data & Media", icon: Database },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => void handleTabChange(item.id as TabType)}
                  className={cn(
                    "flex items-center gap-2.5 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-full sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === item.id
                      ? "bg-foreground text-background shadow-md sm:scale-[1.02]"
                      : "hover:bg-secondary/50 text-muted-foreground",
                  )}
                >
                  <item.icon size={14} className="sm:w-4 sm:h-4" /> {item.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex justify-start gap-3 rounded-xl text-muted-foreground hover:text-destructive mt-auto"
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
            >
              <LogOut size={16} /> Logout
            </Button>
          </div>

          {/* 🏛️ Content */}
          <div className="flex-1 p-5 sm:p-8 overflow-y-auto no-scrollbar pb-24 sm:pb-8">
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Account Identity
                </h3>

                {/* 📸 Avatar Section */}
                <div className="flex flex-col items-center sm:items-start gap-4 mb-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                  <button
                    onClick={onCameraClick}
                    className="relative group transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className="h-24 w-24 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-secondary/30 relative">
                      {currentDisplayImage ? (
                        <Image
                          src={currentDisplayImage}
                          alt={user.name || "User"}
                          fill
                          className="object-cover"
                          unoptimized={
                            currentDisplayImage.startsWith("blob:") ||
                            currentDisplayImage.includes("googleusercontent")
                          }
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <User size={40} />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 p-1.5 bg-foreground text-background rounded-full border-2 border-background shadow-lg">
                      <Camera size={12} />
                    </div>
                  </button>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    {localPreview
                      ? "New Avatar Ready"
                      : "Click to change avatar"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                      Display Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary/20 p-4 sm:p-3.5 rounded-2xl border border-border/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-full"
                    />
                  </div>
                  <div className="grid gap-1.5 opacity-60">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                      Email
                    </label>
                    <div className="bg-secondary/10 p-4 sm:p-3.5 rounded-2xl border border-border/50 text-sm font-medium italic">
                      {user?.email}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isUpdating || (name === user?.name && !croppedBlob)}
                  className="w-full gap-2 rounded-2xl h-12 font-black uppercase tracking-widest shadow-xl"
                >
                  {isUpdating ? (
                    <div className="h-4 w-4 border-2 border-background border-t-transparent animate-spin rounded-full" />
                  ) : (
                    "Save Changes"
                  )}
                  <Save size={16} />
                </Button>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold tracking-tight">
                  Visual Themes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {[
                    {
                      id: "light",
                      name: "Zen",
                      color: "bg-zinc-100",
                      textColor: "text-zinc-900",
                    },
                    {
                      id: "warm-minimal",
                      name: "Sand",
                      color: "bg-[#D4C3A3]",
                      textColor: "text-[#433928]",
                    },
                    {
                      id: "moonlight",
                      name: "Moon",
                      color: "bg-[#1e1b4b]",
                      textColor: "text-[#e0e7ff]",
                    },
                    {
                      id: "terminal",
                      name: "Matrix",
                      color: "bg-[#0c0c0c]",
                      textColor: "text-[#FFB000]",
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "h-20 sm:h-28 rounded-[20px] sm:rounded-3xl cursor-pointer transition-all p-4 sm:p-5 flex flex-col justify-between items-start border-2 relative overflow-hidden group",
                        t.color,
                        theme === t.id
                          ? "border-primary ring-2 ring-primary/10 scale-[1.01]"
                          : "border-transparent hover:border-border/60",
                      )}
                    >
                      {theme === t.id && (
                        <div className="absolute top-3 right-3 bg-foreground/10 backdrop-blur-md px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1">
                          <Check
                            className={cn(
                              "w-2.5 h-2.5 sm:h-3 sm:w-3",
                              t.textColor,
                            )}
                          />
                          <span
                            className={cn(
                              "text-[7px] sm:text-[8px] font-black uppercase",
                              t.textColor,
                            )}
                          >
                            Active
                          </span>
                        </div>
                      )}
                      <div className="mt-auto">
                        <span
                          className={cn(
                            "text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em]",
                            t.textColor,
                          )}
                        >
                          {t.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold tracking-tight">
                    Data & Media
                  </h3>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/5 border border-green-500/20 rounded-full">
                    <ShieldCheck size={10} className="text-green-500" />
                    <span className="text-[7px] sm:text-[8px] font-bold text-green-600 uppercase">
                      AES-256
                    </span>
                  </div>
                </div>

                <div className="bg-secondary/20 border border-border/40 p-4 sm:p-5 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Media Library</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">
                        {stats.fileCount} Objects
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono font-bold opacity-70">
                      <span>{loading ? "..." : `${stats.usedMB} MB`}</span>
                      <span>50 MB Limit</span>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000 ease-out"
                        style={{ width: `${(stats.usedMB / 50) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {stats.files.length > 0
                      ? stats.files.map((file: any) => (
                          <div
                            key={file.key}
                            className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border border-border/40 bg-muted"
                          >
                            <Image
                              src={file.url}
                              fill
                              className="object-cover grayscale hover:grayscale-0 transition-all"
                              alt="R2"
                            />
                          </div>
                        ))
                      : [1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-lg sm:rounded-xl bg-secondary/40 border border-dashed border-border/60 flex items-center justify-center opacity-20"
                          >
                            <ImageIcon size={12} />
                          </div>
                        ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="bg-secondary/10 border border-border/20 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HardDrive size={16} className="text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">
                        JSON Export
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[9px] font-bold uppercase tracking-widest"
                    >
                      Download
                    </Button>
                  </div>
                  <div className="pt-4 mt-2 border-t border-destructive/10">
                    <Button
                      variant="outline"
                      className="w-full gap-2 h-10 rounded-xl border-destructive/20 text-destructive text-xs"
                    >
                      <Trash2 size={14} /> Wipe All Archives
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 📸 Separate Avatar Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-100 p-0 overflow-hidden bg-background rounded-3xl border-border/40 shadow-2xl">
          <div className="p-6 pb-2 text-center">
            <DialogTitle className="text-lg font-black tracking-tighter uppercase italic">
              Adjust Avatar
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Position your picture within the sanctuary lens.
            </DialogDescription>
          </div>
          <div className="relative h-80 w-full bg-black">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </div>
          <div className="p-6 space-y-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 rounded-xl font-bold text-xs"
                onClick={() => {
                  setShowCropper(false);
                  setImageSrc(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl font-bold text-xs"
                onClick={generatePreview}
              >
                Set Preview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
