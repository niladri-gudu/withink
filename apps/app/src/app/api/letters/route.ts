import { NextResponse, type NextRequest } from "next/server";
import { saveLetterSchema } from "@withink/contracts";

import { apiError } from "@/server/api-error";
import { BodyTooLargeError, readJsonBody } from "@/server/request-body";
import {
  listLettersAction,
  upsertLetterAction,
} from "@/features/letters/actions/letter-actions";

import { apiErrorFromResult, requireApiSession } from "../_lib";

// Matches the entry ceiling: two ciphertext blobs per letter.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

/** The shelf: letter metadata plus the viewer-local today. */
export async function GET() {
  const auth = await requireApiSession("letters:list");
  if (auth.response) return auth.response;

  const result = await listLettersAction();
  if (!result.success) return apiErrorFromResult(result, "INTERNAL");
  return NextResponse.json({
    letters: result.data ?? [],
    today: result.today ?? "",
  });
}

/** Create a draft, auto-save, or seal on save (plan limits enforced). */
export async function POST(request: NextRequest) {
  const auth = await requireApiSession("letters:write", 60);
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

  const parsed = saveLetterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid letter.",
    );
  }

  const result = await upsertLetterAction(parsed.data);
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json(result.data);
}
