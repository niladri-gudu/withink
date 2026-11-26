import { NextResponse } from "next/server";
import { letterIdSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { sealLetterAction } from "@/features/letters/actions/letter-actions";

import { apiErrorFromResult, requireApiSession } from "../../../_lib";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Seals a draft. After this the server refuses reads and edits until the
 * unlock day, so the seal is the real state transition, not a UI flag.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession("letters:write", 60);
  if (auth.response) return auth.response;

  const parsed = letterIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid letter.");

  const result = await sealLetterAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json(result.data);
}
