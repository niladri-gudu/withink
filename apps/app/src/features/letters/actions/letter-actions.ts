"use server";

import { cookies } from "next/headers";

import { getLocalDateString, isDateString } from "@/lib/utils/date";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { LockService } from "@/features/lock/services/lock-service";

import {
  LetterFrozenError,
  LetterLimitError,
  LetterSealedError,
  LettersService,
} from "../services/letter-service";
import {
  getLetterSchema,
  saveLetterSchema,
  type SaveLetterParsed,
} from "../validation/letter-schema";

export type { LetterFullRecord, LetterMetaRecord } from "../services/letter-service";

/**
 * Viewer-local today, resolved server-side from the client-maintained
 * timezone cookie (same resolution as journal pages), never trusted from a
 * request argument.
 */
async function resolveToday(): Promise<string> {
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  return isDateString(cookieToday) ? cookieToday : getLocalDateString();
}

export async function listLettersAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof LettersService.listLetters>>;
  today?: string;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const [letters, today] = await Promise.all([
      LettersService.listLetters(session.user.id),
      resolveToday(),
    ]);
    return { success: true, data: letters, today };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/** Owner-only full payload (ciphertext under ZK) for the composer/reader. */
export async function getLetterForComposeAction(
  letterId: string,
): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof LettersService.getLetter>>;
  today?: string;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const validated = getLetterSchema.parse({ letterId });
    const today = await resolveToday();
    const letter = await LettersService.getLetter(
      session.user.id,
      validated.letterId,
      today,
    );
    return { success: true, data: letter, today };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Create (absent letterId) or auto-save (present letterId) a letter.
 * Capacity is asserted server-side at the creation moment only — editing
 * existing active letters is grandfathered against any plan change.
 */
export async function upsertLetterAction(
  input: unknown,
): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof LettersService.upsertLetter>>;
  error?: string;
  code?: "LETTER_LIMIT_REACHED" | "LETTER_FROZEN";
  limit?: number;
}> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const validated = saveLetterSchema.parse(input) as SaveLetterParsed;
    const isNew = !validated.letterId;

    const limit_ = await rateLimit(
      isNew
        ? `letters-create:${session.user.id}`
        : `letters-write:${session.user.id}`,
      isNew
        ? { limit: 10, windowSeconds: 3_600 }
        : { limit: 30, windowSeconds: 60 },
    );
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    const today = await resolveToday();
    const letter = await LettersService.upsertLetter(
      session.user.id,
      validated,
      today,
    );
    return { success: true, data: letter };
  } catch (err) {
    if (err instanceof LetterLimitError) {
      return {
        success: false,
        error: err.safeMessage,
        code: err.kind,
        limit: err.limit,
      };
    }
    if (err instanceof LetterFrozenError) {
      return { success: false, error: err.safeMessage, code: err.kind };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function sealLetterAction(
  letterId: string,
): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof LettersService.sealLetter>>;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const validated = getLetterSchema.parse({ letterId });

    const limit_ = await rateLimit(`letters-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    const today = await resolveToday();
    const letter = await LettersService.sealLetter(
      session.user.id,
      validated.letterId,
      today,
    );
    return { success: true, data: letter };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function deleteLetterAction(
  letterId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const validated = getLetterSchema.parse({ letterId });

    const limit_ = await rateLimit(`letters-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await LettersService.deleteLetter(session.user.id, validated.letterId);
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/** Opening a sealed letter early is refused server-side, code for the toast. */
export async function revealLetterAction(
  letterId: string,
): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof LettersService.revealLetter>>;
  error?: string;
  code?: "LETTER_SEALED";
}> {
  try {
    const session = await getRequestSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) return { success: false, error: "Locked" };

    const validated = getLetterSchema.parse({ letterId });

    const limit_ = await rateLimit(`letters-reveal:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    const today = await resolveToday();
    const letter = await LettersService.revealLetter(
      session.user.id,
      validated.letterId,
      today,
    );
    return { success: true, data: letter };
  } catch (err) {
    if (err instanceof LetterSealedError) {
      return { success: false, error: err.safeMessage, code: err.kind };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
