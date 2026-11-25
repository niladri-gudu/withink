import "server-only";

import { z } from "zod";

import { isEncryptedOrEmpty } from "@withink/core/ciphertext";
import type {
  NotebookSummary,
  SaveEntryResult,
  SyncEntryPayload,
  SyncListItem,
  SyncPushRejection,
  SyncPushResult,
} from "@withink/core";

import { clampViewerToday } from "@/lib/viewer-today";
import { BusinessRuleError, handleError } from "@/server/errors";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { NotebookRepository } from "@/features/notebooks/repositories/notebook-repository";
import { NotebooksService } from "@/features/notebooks/services/notebook-service";

import { dateStringSchema, saveEntrySchema } from "../validation/entry-schema";
import { EntryRepository } from "../repositories/entry-repository";
import { JournalService } from "./journal-service";

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

/**
 * Resolves a client-supplied notebook id to a filing target the user owns.
 * Unknown/foreign ids fall back to the default notebook so an offline save
 * never fails. Shared by the Server Action and the sync API.
 */
export async function resolveFilingTarget(
  userId: string,
  notebookId: string,
): Promise<string> {
  const owned = await NotebookRepository.getById(userId, notebookId);
  return owned ? owned.id : await NotebooksService.getDefaultNotebookId(userId);
}

/**
 * Server side of the local-first sync API. The web still uses Server Actions;
 * this service is the shared contract non-Next clients (Expo) call over HTTP.
 *
 * It never decrypts content: zero-knowledge fields are opaque ciphertext and
 * are persisted as-is after the same plaintext-refusal guard the action uses.
 */
export class EntrySyncService {
  static async manifest(userId: string): Promise<SyncListItem[]> {
    const list = await JournalService.getEntrySyncList(userId);
    return list.map((item) => ({
      date: item.date,
      updatedAt:
        item.updatedAt instanceof Date
          ? item.updatedAt.toISOString()
          : new Date(item.updatedAt).toISOString(),
    }));
  }

  static async pull(
    userId: string,
    dates: string[],
  ): Promise<SyncEntryPayload[]> {
    const entries = await JournalService.getEntriesByIds(userId, dates);
    return entries.map((entry) => ({
      date: entry.date,
      title: entry.title,
      contentHtml: entry.contentHtml,
      contentText: entry.contentText,
      contentJson:
        typeof entry.contentJson === "string"
          ? entry.contentJson
          : JSON.stringify(entry.contentJson ?? {}),
      wordCount: entry.wordCount,
      mood: entry.mood,
      notebookId: entry.notebookId,
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    }));
  }

  static async push(
    userId: string,
    inputs: SyncPushEntry[],
  ): Promise<SyncPushResult> {
    // Two request-scoped reads, once per batch (not per entry).
    const [encryptionSettings, entitlements] = await Promise.all([
      EncryptionSettingsRepository.getSettings(userId),
      EntitlementsService.getEntitlements(userId),
    ]);

    const saved: SaveEntryResult[] = [];
    const rejected: SyncPushRejection[] = [];

    for (const input of inputs) {
      try {
        const validated = saveEntrySchema.parse(input);
        const today = clampViewerToday(input.today);

        if (encryptionSettings?.isClientEncrypted) {
          const contentFields = [
            ["title", validated.title],
            ["contentHtml", validated.contentHtml],
            ["contentText", validated.contentText],
            ["contentJson", validated.contentJson],
          ] as const;
          for (const [field, value] of contentFields) {
            if (!isEncryptedOrEmpty(value)) {
              throw new Error(
                `Encrypted journals can only save encrypted ${field}.`,
              );
            }
          }
        }

        // Stale-write guard (opt-in): the client tells us which server version
        // it edited. If the entry moved on since then — edited or deleted on
        // another device — reject so the client can pull and merge instead of
        // silently overwriting.
        if (input.baseUpdatedAt) {
          const current = await EntryRepository.getEntry(
            userId,
            validated.date,
          );
          if (!current) {
            throw new BusinessRuleError(
              "This entry was deleted on another device. Pull the latest and try again.",
            );
          }
          const currentUpdatedAt = new Date(current.updatedAt).getTime();
          if (currentUpdatedAt !== new Date(input.baseUpdatedAt).getTime()) {
            throw new BusinessRuleError(
              "This entry changed on another device. Pull the latest and try again.",
            );
          }
        }

        const filingTarget = validated.notebookId
          ? await resolveFilingTarget(userId, validated.notebookId)
          : undefined;

        const entry = await JournalService.saveJournalEntry(
          userId,
          validated.date,
          {
            title: validated.title,
            mood: validated.mood,
            contentHtml: validated.contentHtml,
            contentText: validated.contentText,
            contentJson: validated.contentJson,
            wordCount: validated.wordCount,
          },
          today,
          {
            backfillDays: entitlements.backfillDays,
            notebookId: filingTarget,
          },
        );

        saved.push({
          date: entry.date,
          updatedAt: new Date(entry.updatedAt).toISOString(),
          notebookId: entry.notebookId,
        });
      } catch (error) {
        rejected.push({
          date: input.date,
          reason:
            error instanceof z.ZodError
              ? "Invalid entry payload."
              : handleError(error).safeMessage,
        });
      }
    }

    return { saved, rejected };
  }

  static async remove(userId: string, date: string): Promise<boolean> {
    return await JournalService.deleteEntry(userId, date);
  }

  static async notebooks(userId: string): Promise<NotebookSummary[]> {
    return await NotebooksService.listNotebooks(userId);
  }
}
