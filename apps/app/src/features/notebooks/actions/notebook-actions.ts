"use server";

import { z } from "zod";

import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { dateStringSchema } from "@/features/journal/validation/entry-schema";
import { LockService } from "@/features/lock/services/lock-service";

import {
  NotebookLimitError,
  NotebooksService,
  type NotebookSummary,
} from "../services/notebook-service";

// Notebook ids arrive from the client (Server Action args are attacker-
// controlled) — pin them to Mongo ObjectId shape before they reach a query.
const notebookIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid notebook.");

export async function listNotebooksAction(): Promise<{
  success: boolean;
  data?: NotebookSummary[];
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const notebooks = await NotebooksService.listNotebooks(session.user.id);
    return { success: true, data: notebooks };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function createNotebookAction(name: string): Promise<{
  success: boolean;
  data?: NotebookSummary;
  error?: string;
  /** Machine-readable gate signal; drives the paywall vs. cap dialog. */
  code?: "NOTEBOOK_LIMIT_REACHED";
  limit?: number;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const validatedName = z.string().max(200).parse(name);

    // Creation is the gated operation — throttle it per user.
    const limit_ = await rateLimit(`notebooks-create:${session.user.id}`, {
      limit: 10,
      windowSeconds: 3_600,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    const notebook = await NotebooksService.createNotebook(
      session.user.id,
      validatedName,
    );
    return { success: true, data: notebook };
  } catch (err) {
    if (err instanceof NotebookLimitError) {
      return {
        success: false,
        error: err.safeMessage,
        code: err.kind,
        limit: err.limit,
      };
    }
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function renameNotebookAction(
  notebookId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const validated = z
      .object({
        notebookId: notebookIdSchema,
        name: z.string().max(200),
      })
      .parse({ notebookId, name });

    const limit_ = await rateLimit(`notebooks-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await NotebooksService.renameNotebook(
      session.user.id,
      validated.notebookId,
      validated.name,
    );
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function deleteNotebookAction(
  notebookId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const validated = notebookIdSchema.parse(notebookId);

    const limit_ = await rateLimit(`notebooks-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await NotebooksService.deleteNotebook(session.user.id, validated);
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/** Chooses where new quick-writes (dashboard, calendar) land by default. */
export async function setDefaultNotebookAction(
  notebookId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const validated = notebookIdSchema.parse(notebookId);

    const limit_ = await rateLimit(`notebooks-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await NotebooksService.setDefaultNotebook(session.user.id, validated);
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

/**
 * Files an existing entry into another notebook. Explicit intent only —
 * never called by autosave.
 */
export async function moveEntryToNotebookAction(
  date: string,
  notebookId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
      return { success: false, error: "Locked" };
    }

    const validated = z
      .object({
        date: dateStringSchema,
        notebookId: notebookIdSchema,
      })
      .parse({ date, notebookId });

    const limit_ = await rateLimit(`notebooks-write:${session.user.id}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit_.success) {
      return { success: false, error: "Too many requests. Try again soon." };
    }

    await NotebooksService.moveEntryToNotebook(
      session.user.id,
      validated.date,
      validated.notebookId,
    );
    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
