"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Textarea } from "@withink/ui/textarea";
import { cn } from "@withink/utils";
import {
  Bug,
  Check,
  ImagePlus,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { LIMITS } from "@/constants/limits";
import { ROUTES } from "@/constants/routes";

import { submitFeedbackAction } from "../actions/feedback-actions";
import {
  feedbackSchema,
  type FeedbackCategory,
  type FeedbackInput,
} from "../validation/feedback-schema";

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
        className="border-border bg-card rounded-xl border p-8 text-center shadow-sm sm:p-12"
      >
        <div className="bg-accent/15 text-accent-foreground mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <Check className="text-accent h-7 w-7" />
        </div>
        <h2 className="text-h3 text-foreground mt-6">Thank you.</h2>
        <p className="text-body-small text-muted-foreground mx-auto mt-2 max-w-sm">
          Your note is on its way to us. Every message helps make your sanctuary
          calmer and more thoughtful.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            onClick={startAnother}
            variant="outline"
            className="px-6"
          >
            Send another
          </Button>
          <Button asChild className="px-6">
            <Link href={ROUTES.APP.DASHBOARD}>Back to Today</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-card rounded-xl border p-6 shadow-sm sm:p-8"
    >
      {/* Category picker */}
      <fieldset className="space-y-3">
        <legend className="text-body-small text-foreground font-medium">
          What kind of message is this?
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <label
                key={c.id}
                className={cn(
                  "has-[:focus-visible]:ring-accent flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-1",
                  active
                    ? "border-accent bg-accent/5 ring-accent/30 ring-1"
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
                  <span className="text-body-small text-foreground block font-medium">
                    {c.label}
                  </span>
                  <span className="text-caption block">{c.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Subject */}
      <div className="mt-6 space-y-2">
        <label
          htmlFor="feedback-subject"
          className="text-body-small text-foreground font-medium"
        >
          Summary
        </label>
        <Input
          id="feedback-subject"
          placeholder={activeCategory.subjectPlaceholder}
          aria-invalid={!!errors.subject}
          aria-describedby={
            errors.subject ? "feedback-subject-error" : undefined
          }
          {...register("subject")}
        />
        {errors.subject && (
          <p
            id="feedback-subject-error"
            className="text-caption text-destructive"
          >
            {errors.subject.message}
          </p>
        )}
      </div>

      {/* Message */}
      <div className="mt-5 space-y-2">
        <label
          htmlFor="feedback-message"
          className="text-body-small text-foreground font-medium"
        >
          Details
        </label>
        <Textarea
          id="feedback-message"
          rows={6}
          placeholder={activeCategory.messagePlaceholder}
          aria-invalid={!!errors.message}
          aria-describedby={
            errors.message ? "feedback-message-error" : undefined
          }
          {...register("message")}
        />
        {errors.message && (
          <p
            id="feedback-message-error"
            className="text-caption text-destructive"
          >
            {errors.message.message}
          </p>
        )}
      </div>

      {/* Screenshot */}
      <div className="mt-5 space-y-2">
        <span className="text-body-small text-foreground font-medium">
          Screenshot{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
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
              className="border-border relative inline-flex overflow-hidden rounded-xl border"
            >
              <Image
                src={imageUrl}
                alt="Attached screenshot"
                width={176}
                height={176}
                className="h-auto max-h-44 w-auto object-contain"
                style={{ width: "auto", height: "auto" }}
              />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove screenshot"
                className="bg-foreground/60 text-background hover:bg-foreground/80 absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
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
              className="border-border bg-secondary/30 text-body-small text-muted-foreground hover:border-accent/50 hover:bg-secondary/50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-colors disabled:opacity-60"
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
          className="gap-2 px-6"
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
