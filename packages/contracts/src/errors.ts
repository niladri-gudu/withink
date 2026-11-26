import { z } from "zod";

/**
 * Machine-readable error codes shared by every HTTP surface.
 *
 * Both clients branch on `code`; `error` is human-readable copy and may change.
 * Additive changes are safe; renaming a code is a breaking wire change.
 */
export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "LOCKED",
  "UNLOCK_PROOF_INVALID",
  "UNLOCK_PROOF_NOT_BOUND",
  "RATE_LIMITED",
  "INVALID_REQUEST",
  "PAYLOAD_TOO_LARGE",
  "VALIDATION_FAILED",
  "BUSINESS_RULE",
  "NOTEBOOK_LIMIT_REACHED",
  "STORAGE_QUOTA_EXCEEDED",
  "INTERNAL",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.enum(API_ERROR_CODES).optional(),
  details: z.record(z.unknown()).optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

/** HTTP status for each code. 422 is the existing convention for rule failures. */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  LOCKED: 403,
  UNLOCK_PROOF_INVALID: 403,
  UNLOCK_PROOF_NOT_BOUND: 403,
  RATE_LIMITED: 429,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_FAILED: 400,
  BUSINESS_RULE: 422,
  NOTEBOOK_LIMIT_REACHED: 422,
  STORAGE_QUOTA_EXCEEDED: 507,
  INTERNAL: 500,
};
