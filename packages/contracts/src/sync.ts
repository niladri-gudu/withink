import { z } from "zod";

import type {
  NotebookSummary,
  SaveEntryResult,
  SyncEntryPayload,
  SyncListItem,
  SyncPushRejection,
} from "@withink/core";
import { SYNC_BULK_LIMIT } from "@withink/core/sync";

/**
 * The single source of truth for every sync wire shape.
 *
 * The web Server Actions, the HTTP routes, `@withink/api-client` and the Expo
 * client all import these. Changing a field here is the only way to change the
 * contract, which is what keeps web and native from drifting apart.
 */

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD.");

export const notebookIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid notebook.");

export const saveEntrySchema = z.object({
  date: dateStringSchema,
  title: z
    .string()
    .max(1000, "Title cannot exceed 1000 characters.")
    .default(""),
  mood: z.number().int().min(1).max(5).nullable().optional().default(null),
  // Bounds are generous (far above any real entry) but exist so a crafted
  // payload can't smuggle unbounded strings into Mongo or poison stats.
  contentHtml: z.string().max(2_000_000).default(""),
  contentText: z.string().max(1_000_000).default(""),
  contentJson: z.any().optional(),
  wordCount: z.number().int().min(0).max(1_000_000).optional(),
  /**
   * Notebook filing target for NEW entries. Omitted by legacy clients and
   * older offline queue items (no filing change); ownership + fallback to
   * the default notebook are resolved server-side.
   */
  notebookId: notebookIdSchema.optional(),
});

export type SaveEntryInput = z.infer<typeof saveEntrySchema>;

/** One entry as accepted by `POST /api/sync/push`. */
export const syncPushEntrySchema = saveEntrySchema.extend({
  /** Viewer-local today, used to enforce the plan's backfill window. */
  today: dateStringSchema,
  /**
   * Last `updatedAt` the client saw. When supplied, a push that would
   * overwrite a newer server copy is rejected instead of clobbering it.
   */
  baseUpdatedAt: z.string().optional(),
});

export type SyncPushEntry = z.infer<typeof syncPushEntrySchema>;

export const syncPullRequestSchema = z.object({
  dates: z.array(dateStringSchema).min(1).max(SYNC_BULK_LIMIT),
});

export const syncPushRequestSchema = z.object({
  entries: z.array(syncPushEntrySchema).min(1).max(SYNC_BULK_LIMIT),
});

export const syncDeleteRequestSchema = z.object({
  date: dateStringSchema,
});

export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export type SyncDeleteRequest = z.infer<typeof syncDeleteRequestSchema>;

/** One route, one discriminated body; the API client exposes one method per action. */
export const notebookMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().max(200) }),
  z.object({
    action: z.literal("rename"),
    id: notebookIdSchema,
    name: z.string().max(200),
  }),
  z.object({ action: z.literal("delete"), id: notebookIdSchema }),
  z.object({ action: z.literal("set-default"), id: notebookIdSchema }),
  z.object({
    action: z.literal("move-entry"),
    date: dateStringSchema,
    notebookId: notebookIdSchema,
  }),
]);

export type NotebookMutation = z.infer<typeof notebookMutationSchema>;

// Response shapes are plain JSON; they are shared so both clients parse the
// same objects. Content fields stay opaque ciphertext.
export interface SyncManifestResponse {
  entries: SyncListItem[];
}

export interface SyncPullResponse {
  entries: SyncEntryPayload[];
}

export interface SyncPushResponse {
  saved: SaveEntryResult[];
  rejected: SyncPushRejection[];
}

export interface SyncDeleteResponse {
  success: boolean;
}

export interface SyncNotebooksResponse {
  notebooks: NotebookSummary[];
}

export interface SyncNotebookMutationResponse {
  success: boolean;
  /** Present on `create`. */
  notebook?: NotebookSummary;
}
