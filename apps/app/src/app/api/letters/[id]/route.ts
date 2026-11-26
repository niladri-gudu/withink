import { NextResponse } from "next/server";
import { letterIdSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import {
  deleteLetterAction,
  getLetterForComposeAction,
} from "@/features/letters/actions/letter-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner-only payload for the composer/reader (sealed bodies stay sealed). */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession("letters:read");
  if (auth.response) return auth.response;

  const parsed = letterIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid letter.");

  const result = await getLetterForComposeAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({
    letter: result.data,
    today: result.today ?? "",
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession("letters:write", 60);
  if (auth.response) return auth.response;

  const parsed = letterIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid letter.");

  const result = await deleteLetterAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
