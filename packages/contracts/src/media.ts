import { z } from "zod";

/** One object in the reader's journal library (private delivery URL). */
export interface MediaFileView {
  key: string;
  /** Stable authenticated URL (`/api/media/<key>`), never a public bucket URL. */
  url: string;
  size: number;
  lastModified: string | null;
}

export interface MediaStorageStats {
  usedMB: number;
  fileCount: number;
  limitMB: number;
  percentUsed: number;
}

export interface MediaLibraryResponse {
  files: MediaFileView[];
  stats: MediaStorageStats;
}

/** Matches the server's accepted MIME list; the extension is derived there. */
export const MEDIA_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/png",
  "image/gif",
] as const;

export const MEDIA_FOLDERS = [
  "journal",
  "feedback",
  "issue",
  "avatar",
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** 5 MB per file — the server's safety bound, not a plan perk. */
export const MEDIA_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const mediaUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(MEDIA_ALLOWED_TYPES),
  size: z.number().int().positive().max(MEDIA_MAX_FILE_BYTES),
  folder: z.enum(MEDIA_FOLDERS).optional(),
});

export type MediaUploadRequest = z.input<typeof mediaUploadRequestSchema>;

export interface MediaUploadResponse {
  /** Presigned PUT valid for one hour. */
  presignedUrl: string;
  /** Stable authenticated delivery URL to store in entry content. */
  publicUrl: string;
}
