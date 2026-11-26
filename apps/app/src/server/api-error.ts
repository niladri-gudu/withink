import "server-only";

import { NextResponse } from "next/server";
import {
  API_ERROR_STATUS,
  type ApiErrorBody,
  type ApiErrorCode,
} from "@withink/contracts";

import { handleError, type ErrorType } from "./errors";

/**
 * One error envelope for every HTTP surface: `{ error, code, details? }`.
 * Clients branch on `code`; `error` is display copy.
 */
const CODE_BY_TYPE: Record<ErrorType, ApiErrorCode> = {
  VALIDATION: "VALIDATION_FAILED",
  AUTHENTICATION: "UNAUTHORIZED",
  AUTHORIZATION: "FORBIDDEN",
  BUSINESS_RULE: "BUSINESS_RULE",
  INFRASTRUCTURE: "INTERNAL",
  UNEXPECTED: "INTERNAL",
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorBody["details"],
): NextResponse {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status: API_ERROR_STATUS[code] },
  );
}

/** Normalizes any thrown value into the shared envelope. */
export function apiErrorFrom(error: unknown): NextResponse {
  const appError = handleError(error);
  return NextResponse.json(
    { error: appError.safeMessage, code: CODE_BY_TYPE[appError.type] },
    { status: appError.statusCode },
  );
}
