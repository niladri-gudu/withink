import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { dateStringSchema } from "@/features/journal/validation/entry-schema";
import { EntrySyncService } from "@/features/journal/services/entry-sync-service";
import {
  NotebookLimitError,
  NotebooksService,
} from "@/features/notebooks/services/notebook-service";

import { requireSyncSession } from "../_lib";

const notebookIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid notebook.");

/**
 * Mutations mirror the web's Server Actions so native clients can manage the
 * shelf too. One route, one discriminated body — the client library exposes a
 * method per action.
 */
const notebookActionSchema = z.discriminatedUnion("action", [
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

/** Notebook membership/usage for local-first clients. */
export async function GET() {
  const auth = await requireSyncSession("notebooks");
  if (auth.response) return auth.response;

  try {
    return NextResponse.json({
      notebooks: await EntrySyncService.notebooks(auth.userId),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.safeMessage },
      { status: appError.statusCode },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSyncSession("notebooks:write", 60);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = notebookActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
        return NextResponse.json(
          { error: "Too many requests. Try again soon." },
          { status: 429 },
        );
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
    const appError = handleError(error);
    return NextResponse.json(
      {
        error: appError.safeMessage,
        ...(error instanceof NotebookLimitError
          ? { code: "NOTEBOOK_LIMIT_REACHED" }
          : {}),
      },
      { status: appError.statusCode },
    );
  }
}
