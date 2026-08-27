import "server-only";

import { isDateString } from "@/lib/utils/date";
import { BusinessRuleError, ValidationError } from "@/server/errors";
import type { ResolvedPlan } from "@/features/billing/config/plans";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

import { NotebookRepository } from "../repositories/notebook-repository";
import { normalizeNotebookName } from "../validation/notebook-schema";

/** Name of the lazily-bootstrapped first notebook. */
export const DEFAULT_NOTEBOOK_NAME = "Journal";

export interface NotebookSummary {
  id: string;
  name: string;
  isDefault: boolean;
  entryCount: number;
  /** ISO timestamp of the notebook's most recent write, or null when empty. */
  lastWrittenAt: string | null;
}

/**
 * Thrown when a user at their plan's notebook limit tries to create another
 * one. The action layer maps this to a structured envelope so the client can
 * open the paywall (Free/Plus) or the informational cap dialog (Pro).
 *
 * Grandfathering: the limit only ever gates CREATION — existing notebooks
 * stay fully readable, writable, renamable, and movable on any tier.
 */
export class NotebookLimitError extends BusinessRuleError {
  readonly kind = "NOTEBOOK_LIMIT_REACHED" as const;

  constructor(
    readonly plan: ResolvedPlan,
    readonly limit: number,
  ) {
    super(
      `You've reached the notebook limit for your plan.`,
      "You've reached the notebook limit for your plan.",
    );
  }
}

export class NotebooksService {
  /**
   * Guarantees every user has at least one notebook with exactly one
   * default, and that no legacy entry (notebookId null) remains unfiled.
   *
   * Runs on every notebooks read path. After the first call it costs one
   * indexed find; the backfill updateMany is a no-op once all rows are
   * claimed (matched via the {userId, notebookId} compound index).
   */
  static async ensureBootstrapped(userId: string): Promise<void> {
    let notebooks = await NotebookRepository.listByUserId(userId);

    if (notebooks.length === 0) {
      try {
        await NotebookRepository.create(userId, DEFAULT_NOTEBOOK_NAME, true);
      } catch {
        // A concurrent bootstrap (another device/session) won the unique-index
        // race; its row serves this call too. Re-list instead of trusting.
      }
      notebooks = await NotebookRepository.listByUserId(userId);
    }

    // Repair path: if no row carries the default flag (shouldn't happen),
    // the oldest survivor is promoted — same policy as delete.
    const oldest = notebooks[0];
    if (oldest && !notebooks.some((n) => n.isDefault)) {
      await NotebookRepository.setDefault(userId, oldest.id);
    }

    const target = notebooks.find((n) => n.isDefault) ?? notebooks[0];
    if (!target) return;

    const moved = await EntryRepository.backfillNullNotebooks(
      userId,
      target.id,
    );
    if (moved > 0) {
      // Timeline/calendar/sync-list caches key off the version; filing
      // legacy entries into a notebook changes those reads. Bump ONLY:
      // this runs during RSC render, where revalidateTag is forbidden —
      // and is sufficient, since filing never alters insights data.
      await EntryRepository.bumpUserEntryVersion(userId);
    }
  }

  /** The default notebook id, bootstrapping on first use. Never null. */
  static async getDefaultNotebookId(userId: string): Promise<string> {
    await this.ensureBootstrapped(userId);

    const def = await NotebookRepository.getDefault(userId);
    if (def) return def.id;

    const all = await NotebookRepository.listByUserId(userId);
    if (all[0]) {
      await NotebookRepository.setDefault(userId, all[0].id);
      return all[0].id;
    }

    const created = await NotebookRepository.create(
      userId,
      DEFAULT_NOTEBOOK_NAME,
      true,
    );
    return created.id;
  }

  /** All notebooks with usage stats, default and oldest first. */
  static async listNotebooks(userId: string): Promise<NotebookSummary[]> {
    await this.ensureBootstrapped(userId);

    const [notebooks, usage] = await Promise.all([
      NotebookRepository.listByUserId(userId),
      EntryRepository.getNotebookUsage(userId),
    ]);

    return notebooks.map((notebook) => {
      const used = usage.get(notebook.id);
      return {
        id: notebook.id,
        name: notebook.name,
        isDefault: notebook.isDefault,
        entryCount: used?.count ?? 0,
        lastWrittenAt: used?.lastWrittenAt ?? null,
      };
    });
  }

  /**
   * Creates a notebook, enforcing the plan's creation limit server-side.
   * Downgraded users over their new limit keep everything — they simply
   * cannot add more until they're under the cap again.
   */
  static async createNotebook(
    userId: string,
    rawName: string,
  ): Promise<NotebookSummary> {
    const name = normalizeNotebookName(rawName);
    await this.ensureBootstrapped(userId);

    const [entitlements, existing] = await Promise.all([
      EntitlementsService.getEntitlements(userId),
      NotebookRepository.listByUserId(userId),
    ]);

    if (existing.length >= entitlements.notebookLimit) {
      throw new NotebookLimitError(
        entitlements.plan,
        entitlements.notebookLimit,
      );
    }

    const duplicate = existing.find(
      (notebook) => notebook.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new BusinessRuleError(`“${name}” already exists on your shelf.`);
    }

    try {
      const created = await NotebookRepository.create(userId, name, false);
      return {
        id: created.id,
        name: created.name,
        isDefault: created.isDefault,
        entryCount: 0,
        lastWrittenAt: null,
      };
    } catch {
      // Unique index caught a concurrent create with the same name.
      throw new BusinessRuleError(`“${name}” already exists on your shelf.`);
    }
  }

  static async renameNotebook(
    userId: string,
    notebookId: string,
    rawName: string,
  ): Promise<void> {
    const name = normalizeNotebookName(rawName);

    const target = await NotebookRepository.getById(userId, notebookId);
    if (!target) {
      throw new BusinessRuleError("That notebook no longer exists.");
    }

    const others = await NotebookRepository.listByUserId(userId);
    const duplicate = others.find(
      (notebook) =>
        notebook.id !== notebookId &&
        notebook.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new BusinessRuleError(`“${name}” already exists on your shelf.`);
    }

    await NotebookRepository.setName(userId, notebookId, name);
  }

  /**
   * Deletes an EMPTY notebook. Non-empty ones must be emptied by moving
   * entries out first — there is deliberately no mass-delete path.
   * Deleting the default promotes the oldest survivor.
   */
  static async deleteNotebook(
    userId: string,
    notebookId: string,
  ): Promise<void> {
    const target = await NotebookRepository.getById(userId, notebookId);
    if (!target) {
      throw new BusinessRuleError("That notebook no longer exists.");
    }

    const entryCount = await EntryRepository.countByNotebook(
      userId,
      notebookId,
    );
    if (entryCount > 0) {
      throw new BusinessRuleError(
        "This notebook still holds entries. Move them to another notebook first.",
      );
    }

    await NotebookRepository.delete(userId, notebookId);

    if (target.isDefault) {
      const remaining = await NotebookRepository.listByUserId(userId);
      if (remaining[0]) {
        await NotebookRepository.setDefault(userId, remaining[0].id);
      }
    }
  }

  /**
   * Flags a different notebook as the default — where new quick-writes
   * (dashboard Today card, calendar clicks without an explicit choice) land.
   */
  static async setDefaultNotebook(
    userId: string,
    notebookId: string,
  ): Promise<void> {
    const target = await NotebookRepository.getById(userId, notebookId);
    if (!target) {
      throw new BusinessRuleError("That notebook no longer exists.");
    }
    await NotebookRepository.setDefault(userId, notebookId);
  }

  /**
   * Files an entry into a different notebook. Explicit user intent only —
   * autosave never moves an existing entry between notebooks.
   */
  static async moveEntryToNotebook(
    userId: string,
    date: string,
    notebookId: string,
  ): Promise<void> {
    if (!isDateString(date)) {
      throw new ValidationError("Invalid date strings provided.");
    }

    const target = await NotebookRepository.getById(userId, notebookId);
    if (!target) {
      throw new BusinessRuleError("That notebook no longer exists.");
    }

    const moved = await EntryRepository.setEntryNotebook(
      userId,
      date,
      notebookId,
    );
    if (!moved) {
      throw new BusinessRuleError("No entry exists on that date.");
    }
  }
}
