"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  Loader2,
  ImagePlus,
  X,
  Check,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  feedbackSchema,
  type FeedbackInput,
  type FeedbackCategory,
} from "../validation/feedback-schema";
import { submitFeedbackAction } from "../actions/feedback-actions";
import { LIMITS } from "@/constants/limits";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  subjectPlaceholder: string;
  messagePlaceholder: string;
}[] = [
  {
    id: "bug",
    label: "Bug",
    description: "Something isn't working",
    icon: Bug,
    subjectPlaceholder: "What went wrong?",
    messagePlaceholder:
      "Describe what happened, what you expected, and how to reproduce it.",
  },
  {
    id: "idea",
    label: "Idea",
    description: "Suggest an improvement",
    icon: Lightbulb,
    subjectPlaceholder: "What would you love to see?",
    messagePlaceholder: "Tell us about the idea and how it would help you.",
  },
  {
    id: "general",
    label: "Note",
    description: "Share a thought",
    icon: MessageCircle,
    subjectPlaceholder: "What's on your mind?",
    messagePlaceholder: "Tell us what you love, or what we could do better.",
  },
];

const ACCEPTED_IMAGE_TYPES = LIMITS.MEDIA.ALLOWED_MIME_TYPES;

export function FeedbackForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [imageUploading, setImageUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: "bug",
      subject: "",
      message: "",
      imageUrl: "",
    },
  });

  const category = useWatch({ control, name: "category" });
  const activeCategory =
    CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]!;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
      toast.error("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > LIMITS.MEDIA.MAX_FILE_SIZE_BYTES) {
      toast.error("Screenshot must be under 5MB.");
      return;
    }

    setImageUploading(true);
    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          folder: "feedback",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not prepare the upload.");
      }

      const { presignedUrl, publicUrl } = await res.json();

      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");

      setImageUrl(publicUrl);
      setValue("imageUrl", publicUrl, { shouldValidate: true });
      toast.success("Screenshot attached.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImageUrl("");
    setValue("imageUrl", "", { shouldValidate: true });
  };

  const onSubmit = async (data: FeedbackInput) => {
    const res = await submitFeedbackAction(data);
    if (!res.success) {
      toast.error(res.error || "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  const startAnother = () => {
    reset();
    setImageUrl("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-h3 text-foreground">Thank you.</h2>
        <p className="mx-auto mt-2 max-w-sm text-body-small text-muted-foreground">
          Your note is on its way to us. Every message helps make your sanctuary
          calmer and more thoughtful.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={startAnother} variant="outline" className="rounded-full px-6">
            Send another
          </Button>
          <Button asChild className="rounded-full px-6">
            <Link href={ROUTES.APP.DASHBOARD}>Back to Today</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      {/* Category picker */}
      <fieldset className="space-y-3">
        <legend className="text-body-small font-medium text-foreground">
          What kind of message is this?
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200",
                  active
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-border hover:border-accent/50 hover:bg-secondary/40",
                )}
              >
                <input
                  type="radio"
                  value={c.id}
                  {...register("category")}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    active
                      ? "border-accent/30 bg-accent/10 text-accent-foreground"
                      : "border-border bg-secondary/60 text-muted-foreground",
                  )}
                >
                  <c.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-small font-medium text-foreground">
                    {c.label}
                  </span>
                  <span className="block text-caption">{c.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Subject */}
      <div className="mt-6 space-y-2">
        <label htmlFor="feedback-subject" className="text-body-small font-medium text-foreground">
          Summary
        </label>
        <Input
          id="feedback-subject"
          placeholder={activeCategory.subjectPlaceholder}
          aria-invalid={!!errors.subject}
          {...register("subject")}
        />
        {errors.subject && (
          <p className="text-caption text-destructive">{errors.subject.message}</p>
        )}
      </div>

      {/* Message */}
      <div className="mt-5 space-y-2">
        <label htmlFor="feedback-message" className="text-body-small font-medium text-foreground">
          Details
        </label>
        <Textarea
          id="feedback-message"
          rows={6}
          placeholder={activeCategory.messagePlaceholder}
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        {errors.message && (
          <p className="text-caption text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Screenshot */}
      <div className="mt-5 space-y-2">
        <span className="text-body-small font-medium text-foreground">
          Screenshot{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelect}
          disabled={imageUploading}
        />

        <AnimatePresence mode="wait">
          {imageUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative inline-flex overflow-hidden rounded-xl border border-border"
            >
              <Image
                src={imageUrl}
                alt="Attached screenshot"
                width={176}
                height={176}
                className="max-h-44 w-auto h-auto object-contain"
                style={{ width: "auto", height: "auto" }}
              />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove screenshot"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/60 text-background backdrop-blur-sm transition-colors hover:bg-foreground/80"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <button
              key="picker"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-body-small text-muted-foreground transition-colors hover:border-accent/50 hover:bg-secondary/50 disabled:opacity-60"
            >
              {imageUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Attach a screenshot
                </>
              )}
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Submit */}
      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || imageUploading}
          className="rounded-full px-6 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send feedback
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
