import { z } from "zod";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD.");

export const saveEntrySchema = z.object({
  date: dateStringSchema,
  title: z.string().max(200, "Title cannot exceed 200 characters.").default(""),
  mood: z.number().int().min(1).max(5).nullable().optional().default(null),
  contentHtml: z.string().default(""),
  contentText: z.string().default(""),
  contentJson: z.any().optional(),
  wordCount: z.number().int().optional(),
});

export type SaveEntryInput = z.infer<typeof saveEntrySchema>;
