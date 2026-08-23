import { z } from "zod";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD.");

export const saveEntrySchema = z.object({
  date: dateStringSchema,
  title: z
    .string()
    .max(1000, "Title cannot exceed 1000 characters.")
    .default(""),
  mood: z.number().int().min(1).max(5).nullable().optional().default(null),
  // Bounds are generous (far above any real entry) but exist so a crafted
  // payload can't smuggle unbounded strings into Mongo or poison stats.
  contentHtml: z.string().max(2_000_000).default(""),
  contentText: z.string().max(1_000_000).default(""),
  contentJson: z.any().optional(),
  wordCount: z.number().int().min(0).max(1_000_000).optional(),
});

export type SaveEntryInput = z.infer<typeof saveEntrySchema>;
