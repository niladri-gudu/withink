import "server-only";

import { z } from "zod";

import { dateStringSchema } from "@/features/journal/validation/entry-schema";

export const letterIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid letter.");

/** Client payload for creating a draft or auto-saving/sealing an existing letter. */
export const saveLetterSchema = z.object({
  /** Absent = create a new draft; present = update (must be owned). */
  letterId: letterIdSchema.optional(),
  unlockDate: dateStringSchema,
  sealed: z.boolean().optional().default(false),
  title: z
    .string()
    .max(1000, "Title cannot exceed 1000 characters.")
    .default(""),
  // Generous bounds identical to journal entries: a crafted payload can't
  // smuggle unbounded strings into Mongo. Ciphertext strings are longer than
  // plaintext — the same ceilings already fit entry ciphertext.
  contentHtml: z.string().max(2_000_000).default(""),
  contentText: z.string().max(1_000_000).default(""),
  contentJson: z.any().optional(),
  wordCount: z.number().int().min(0).max(1_000_000).optional(),
});

export const getLetterSchema = z.object({ letterId: letterIdSchema });

/** Explicit parsed contract (zod's z.any() inference is too loose to trust). */
export interface SaveLetterParsed {
  letterId?: string;
  unlockDate: string;
  sealed: boolean;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson?: unknown;
  wordCount?: number;
}
