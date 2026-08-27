import { z } from "zod";

/**
 * Notebook display name: trimmed, whitespace-collapsed, 1–60 characters.
 * Case-insensitive uniqueness is enforced per user by a unique index
 * (nameLower) plus a friendly pre-check in the service.
 */
export const notebookNameSchema = z
  .string()
  .trim()
  .min(1, "Give your notebook a name.")
  .max(60, "Notebook names max out at 60 characters.")
  .transform((name) => name.replace(/\s+/g, " "));

export type NotebookNameInput = z.infer<typeof notebookNameSchema>;

/**
 * Server-side name normalization shared by every service entry point.
 * Throws zod errors shaped for `handleError` → friendly safeMessage.
 */
export function normalizeNotebookName(raw: string): string {
  return notebookNameSchema.parse(raw);
}
