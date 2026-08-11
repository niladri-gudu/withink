import { z } from "zod";

import { LIMITS } from "@/constants/limits";

/**
 * The kinds of messages a user can send the team. `bug` and `general` preserve
 * the two categories from V1 ("issue" / "feedback"); `idea` is added so feature
 * requests have a natural home.
 */
export const FEEDBACK_CATEGORIES = ["bug", "idea", "general"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/**
 * Shared schema for feedback submission. Used by the client form for inline
 * validation and re-parsed on the server so client input is never trusted.
 *
 * `imageUrl` is only shape-validated here (a URL). Ownership and first-party
 * origin are enforced separately on the server, which is the only place that
 * knows the caller's user id.
 */
export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  subject: z
    .string()
    .trim()
    .min(LIMITS.FEEDBACK.SUBJECT_MIN_LENGTH, "Please add a short summary.")
    .max(LIMITS.FEEDBACK.SUBJECT_MAX_LENGTH, "Summary is too long."),
  message: z
    .string()
    .trim()
    .min(
      LIMITS.FEEDBACK.MESSAGE_MIN_LENGTH,
      "Please share a little more detail.",
    )
    .max(LIMITS.FEEDBACK.MESSAGE_MAX_LENGTH, "Message is too long."),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
