import "server-only";

import { env } from "@/config/env";
import { resend } from "@/lib/email";
import { logger } from "@/server/logger";

import { FeedbackNotification } from "../components/emails/feedback-notification";
import { FeedbackRepository } from "../repositories/feedback-repository";
import type { FeedbackCategory } from "../validation/feedback-schema";

export type SubmitFeedbackInput = {
  userId: string;
  email: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  imageUrl?: string;
};

const CATEGORY_SUBJECT_PREFIX: Record<FeedbackCategory, string> = {
  bug: "[BUG]",
  idea: "[IDEA]",
  general: "[FEEDBACK]",
};

/**
 * Coordinates a feedback submission: persist the record, then notify the team.
 *
 * Persistence is the source of truth — once the record is stored the submission
 * has succeeded. Emailing the team is a best-effort notification and must never
 * cause an otherwise-valid submission to fail.
 */
export class FeedbackService {
  static async submit(input: SubmitFeedbackInput): Promise<void> {
    const record = await FeedbackRepository.create({
      userId: input.userId,
      email: input.email,
      category: input.category,
      subject: input.subject,
      message: input.message,
      imageUrl: input.imageUrl || undefined,
    });

    await this.notifyTeam(input, String(record._id));
  }

  private static async notifyTeam(
    input: SubmitFeedbackInput,
    traceId: string,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: env.CONTACT_EMAIL,
        replyTo: input.email,
        subject: `${CATEGORY_SUBJECT_PREFIX[input.category]} ${input.subject}`,
        react: FeedbackNotification({
          category: input.category,
          subject: input.subject,
          message: input.message,
          fromEmail: input.email,
          imageUrl: input.imageUrl || undefined,
          traceId,
        }),
      });
    } catch (error) {
      // The record is already saved; a failed notification is logged, not thrown.
      logger.error(
        "Failed to send feedback notification email",
        error instanceof Error ? error : undefined,
        { traceId, category: input.category },
      );
    }
  }
}
