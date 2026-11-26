import { NextResponse, type NextRequest } from "next/server";
import { notebookMutationSchema } from "@withink/contracts";

import { apiError, apiErrorFrom } from "@/server/api-error";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";
import {
  NotebookLimitError,
  NotebooksService,
} from "@/features/notebooks/services/notebook-service";

import { requireSyncSession } from "../_lib";

const MAX_BODY_BYTES = 64 * 1024;

/** Notebook membership/usage for local-first clients. */
export async function GET() {
  const auth = await requireSyncSession("notebooks");
  if (auth.response) return auth.response;

  try {
    return NextResponse.json({
      notebooks: await EntrySyncService.notebooks(auth.userId),
    });
  } catch (error) {
    return apiErrorFrom(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("notebooks:write", 60);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof BodyTooLargeError;
    return apiError(
      tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST",
      tooLarge ? "Payload too large." : "Invalid request.",
    );
  }
  const parsed = notebookMutationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid request.");
  }

  const action = parsed.data;

  try {
    // Creation is the gated operation; keep the same hourly cap as the action.
    if (action.action === "create") {
      const limit = await rateLimit(`notebooks-create:${auth.userId}`, {
        limit: 10,
        windowSeconds: 3_600,
      });
      if (!limit.success) {
        return apiError("RATE_LIMITED", "Too many requests. Try again soon.");
      }

      const notebook = await NotebooksService.createNotebook(
        auth.userId,
        action.name,
      );
      return NextResponse.json({ success: true, notebook });
    }

    switch (action.action) {
      case "rename":
        await NotebooksService.renameNotebook(
          auth.userId,
          action.id,
          action.name,
        );
        break;
      case "delete":
        await NotebooksService.deleteNotebook(auth.userId, action.id);
        break;
      case "set-default":
        await NotebooksService.setDefaultNotebook(auth.userId, action.id);
        break;
      case "move-entry":
        await NotebooksService.moveEntryToNotebook(
          auth.userId,
          action.date,
          action.notebookId,
        );
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotebookLimitError) {
      return apiError("NOTEBOOK_LIMIT_REACHED", handleError(error).safeMessage);
    }
    return apiErrorFrom(error);
  }
}
