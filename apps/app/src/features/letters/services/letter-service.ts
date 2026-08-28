import "server-only";

import type { ResolvedPlan } from "@/features/billing/config/plans";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { BusinessRuleError, ValidationError } from "@/server/errors";

import { occupiesSlot } from "../lib/letter-rules";
import type { SaveLetterParsed } from "../validation/letter-schema";
import {
  LetterRepository,
  type LetterFullRecord,
  type LetterMetaRecord,
} from "../repositories/letter-repository";

export type { LetterFullRecord, LetterMetaRecord };

export class LetterLimitError extends BusinessRuleError {
  readonly kind = "LETTER_LIMIT_REACHED" as const;

  constructor(
    readonly plan: ResolvedPlan,
    readonly limit: number,
  ) {
    super(
      "You've reached the active-letter limit for your plan.",
      "You're holding every letter this plan can carry.",
    );
  }
}

export class LetterSealedError extends BusinessRuleError {
  readonly kind = "LETTER_SEALED" as const;

  constructor() {
    super(
      "This letter is not ready to open yet.",
      "This letter isn't ready to open yet.",
    );
  }
}

export class LetterFrozenError extends BusinessRuleError {
  readonly kind = "LETTER_FROZEN" as const;

  constructor() {
    super(
      "A sealed or delivered letter can no longer be changed.",
      "A letter rests once it is sealed; it can't be changed anymore.",
    );
  }
}

/**
 * Workflows for letters to the future self. Slot semantics (grandfathering):
 * an "active" letter is one whose unlock day hasn't arrived; delivered
 * letters free their slot. Capacity is only ever asserted on CREATION —
 * existing active letters are never re-priced against a downgrade.
 *
 * Sealing is the whole point: a sealed letter is UNREADABLE and UNEDITABLE
 * until its unlock day (enforced here, server-side, so client clock tampering
 * can't peek). Delivered letters are frozen history. Only deletion clears
 * either state.
 */
export class LettersService {
  static async listLetters(userId: string): Promise<LetterMetaRecord[]> {
    return LetterRepository.listMeta(userId);
  }

  static async getLetter(
    userId: string,
    letterId: string,
    today: string,
  ): Promise<LetterFullRecord> {
    const letter = await LetterRepository.getFullById(userId, letterId);
    if (!letter) {
      throw new ValidationError("Letter not found.", "Letter not found.");
    }
    // Sealed and not yet delivered: the body stays sealed even from the
    // author (who could technically decrypt it) — that restraint IS the
    // feature. The title on the shelf cards is all that shows.
    if (letter.sealed && occupiesSlot(letter.unlockDate, today)) {
      throw new LetterSealedError();
    }
    return letter;
  }

  /**
   * Create or auto-save a letter. All date decisions arrive via `today`
   * (viewer-local, server-resolved) so the service stays deterministic.
   */
  static async upsertLetter(
    userId: string,
    input: SaveLetterParsed,
    today: string,
  ): Promise<LetterFullRecord> {
    if (!input.letterId) {
      if (!occupiesSlot(input.unlockDate, today)) {
        throw new BusinessRuleError(
          "Letters must open on a future day.",
          "Letters must open on a day that hasn't arrived yet.",
        );
      }
      await this.assertCapacity(userId, today);
      return LetterRepository.createDoc(userId, {
        unlockDate: input.unlockDate,
        sealed: input.sealed ?? false,
        title: input.title,
        contentHtml: input.contentHtml,
        contentText: input.contentText,
        contentJson: input.contentJson ?? {},
        wordCount: input.wordCount ?? 0,
      });
    }

    const existing = await LetterRepository.getFullById(
      userId,
      input.letterId,
    );
    if (!existing) {
      throw new ValidationError("Letter not found.", "Letter not found.");
    }

    // Frozen states (deletion stays open for both):
    // 1. Delivered letters are history — a letter whose day arrived while its
    //    author never sealed it is delivered too; it cannot be dragged back
    //    into the future.
    // 2. Sealed letters rest until their day — that restraint IS the feature.
    if (
      !occupiesSlot(existing.unlockDate, today) ||
      (existing.sealed && occupiesSlot(existing.unlockDate, today))
    ) {
      throw new LetterFrozenError();
    }

    if (
      input.unlockDate !== existing.unlockDate &&
      !occupiesSlot(input.unlockDate, today)
    ) {
      throw new BusinessRuleError(
        "Letters must open on a future day.",
        "Letters must open on a day that hasn't arrived yet.",
      );
    }

    return (
      (await LetterRepository.updateDoc(userId, input.letterId, {
        unlockDate: input.unlockDate,
        sealed: input.sealed ?? existing.sealed,
        title: input.title,
        contentHtml: input.contentHtml,
        contentText: input.contentText,
        contentJson: input.contentJson ?? {},
        wordCount: input.wordCount ?? existing.wordCount,
      })) ?? existing
    );
  }

  /** Flip a draft to sealed. Only meaningful for letters that haven't arrived. */
  static async sealLetter(
    userId: string,
    letterId: string,
    today: string,
  ): Promise<LetterFullRecord> {
    const existing = await LetterRepository.getFullById(userId, letterId);
    if (!existing) {
      throw new ValidationError("Letter not found.", "Letter not found.");
    }
    if (!occupiesSlot(existing.unlockDate, today)) {
      throw new LetterFrozenError();
    }
    return (
      (await LetterRepository.updateDoc(userId, letterId, { sealed: true })) ??
      existing
    );
  }

  static async deleteLetter(userId: string, letterId: string): Promise<void> {
    await LetterRepository.deleteById(userId, letterId);
  }

  /**
   * Open a delivered letter (and stamp readAt once). Sealed letters refuse
   * here — the server is the authority on the arrival moment, so clock
   * tampering on the client can never surface a letter early.
   */
  static async revealLetter(
    userId: string,
    letterId: string,
    today: string,
  ): Promise<LetterFullRecord> {
    const existing = await LetterRepository.getFullById(userId, letterId);
    if (!existing) {
      throw new ValidationError("Letter not found.", "Letter not found.");
    }
    if (!occupiesSlot(existing.unlockDate, today)) {
      await LetterRepository.markReadIfUnread(userId, letterId);
      return existing;
    }
    throw new LetterSealedError();
  }

  /** Delivered and still unopened — the dashboard arrival note's source. */
  static async listArrivedUnread(
    userId: string,
    today: string,
    limit = 5,
  ): Promise<LetterMetaRecord[]> {
    return LetterRepository.listArrivedUnread(userId, today, limit);
  }

  static async getActiveCount(userId: string, today: string): Promise<number> {
    return LetterRepository.countActive(userId, today);
  }

  private static async assertCapacity(
    userId: string,
    today: string,
  ): Promise<void> {
    const entitlements = await EntitlementsService.getEntitlements(userId);
    const limit = entitlements.futureLetterLimit;
    if (limit === Number.POSITIVE_INFINITY) return;

    const active = await LetterRepository.countActive(userId, today);
    if (active >= limit) {
      throw new LetterLimitError(entitlements.plan, limit);
    }
  }
}
