"use server";

import { env } from "@/config/env";
import { LIMITS } from "@/constants/limits";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/rate-limit";

import { FeedbackService } from "../services/feedback-service";
import {
  feedbackSchema,
  type FeedbackInput,
} from "../validation/feedback-schema";

export type SubmitFeedbackResult = { success: boolean; error?: string };

/**
 * Returns true only when `imageUrl` points at this user's own feedback uploads
 * in our R2 bucket. This keeps arbitrary or other-users' URLs out of the stored
 * record and the notification email (no SSRF, no cross-user references).
 */
function isOwnedFeedbackImage(imageUrl: string, userId: string): boolean {
  const envPrefix = env.IS_PROD ? "" : "dev-";
  const expectedBase = `${env.R2_PUBLIC_URL}/${envPrefix}system/${userId}/feedback/`;
  return imageUrl.startsWith(expectedBase);
}

export async function submitFeedbackAction(
  input: FeedbackInput,
): Promise<SubmitFeedbackResult> {
  try {
    // 1. Authenticate.
    const session = await getRequestSession();
    if (!session) {
      return {
        success: false,
        error: "You must be signed in to send feedback.",
      };
    }

    const userId = session.user.id;

    // 2. Validate — never trust the client's shape.
    const parsed = feedbackSchema.safeParse(input);
    if (!parsed.success) {
      const first =
        parsed.error.issues[0]?.message ?? "Please check your submission.";
      return { success: false, error: first };
    }

    const { category, subject, message, imageUrl } = parsed.data;

    // 3. Authorize the optional attachment — first-party, owned uploads only.
    if (imageUrl && !isOwnedFeedbackImage(imageUrl, userId)) {
      return {
        success: false,
        error: "That attachment could not be verified.",
      };
    }

    // 4. Rate limit to prevent flooding.
    const limit = await rateLimit(`feedback:${userId}`, {
      limit: LIMITS.FEEDBACK.RATE_LIMIT_MAX,
      windowSeconds: LIMITS.FEEDBACK.RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!limit.success) {
      return {
        success: false,
        error:
          "You've sent a lot of feedback recently. Please try again later.",
      };
    }

    // 5. Business logic: persist + notify the team.
    await FeedbackService.submit({
      userId,
      email: session.user.email,
      category,
      subject,
      message,
      imageUrl: imageUrl || undefined,
    });

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    logger.error(
      "Feedback submission failed",
      err instanceof Error ? err : undefined,
    );
    return { success: false, error: appError.safeMessage };
  }
}
