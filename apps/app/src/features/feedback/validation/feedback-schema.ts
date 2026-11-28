import {
  FEEDBACK_CATEGORIES,
  feedbackSchema,
  type FeedbackCategory,
  type FeedbackRequest,
} from "@withink/contracts";

/**
 * The validation rules live in `@withink/contracts` so the native client
 * parses the same shape. Re-exported here so feature imports stay local.
 */
export { FEEDBACK_CATEGORIES, feedbackSchema };
export type { FeedbackCategory };
export type FeedbackInput = FeedbackRequest;
