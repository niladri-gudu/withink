import { z } from "zod";

/**
 * Feedback wire shape, shared by the web form, the native form and the
 * `POST /api/feedback` route. `bug` and `general` preserve the two V1
 * categories; `idea` gives feature requests a home.
 *
 * `imageUrl` is only shape-validated here. Ownership (a first-party upload
 * under the caller's `system/<userId>/feedback/` prefix) is enforced by the
 * server action, which is the only place that knows the caller's user id.
 */
export const FEEDBACK_CATEGORIES = ["bug", "idea", "general"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const feedbackSubjectSchema = z
  .string()
  .trim()
  .min(3, "Please add a short summary.")
  .max(120, "Summary is too long.");

export const feedbackMessageSchema = z
  .string()
  .trim()
  .min(10, "Please share a little more detail.")
  .max(4000, "Message is too long.");

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  subject: feedbackSubjectSchema,
  message: feedbackMessageSchema,
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type FeedbackRequest = z.infer<typeof feedbackSchema>;

/** Rate limits mirror `LIMITS.FEEDBACK` in the web app. */
export const FEEDBACK_RATE_LIMIT = { max: 5, windowSeconds: 3600 } as const;
