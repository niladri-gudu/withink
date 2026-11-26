import { NextResponse } from "next/server";
import { letterIdSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { revealLetterAction } from "@/features/letters/actions/letter-actions";

import { apiErrorFromResult, requireApiSession } from "../../../_lib";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Opens a delivered letter. Early reveals fail with `LETTER_SEALED` so the
 * client can show the right message instead of a generic error.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession("letters:write", 60);
  if (auth.response) return auth.response;

  const parsed = letterIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid letter.");

  const result = await revealLetterAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json(result.data);
}
