/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resend } from "@/lib/email";

import { FeedbackRepository } from "../repositories/feedback-repository";
import { FeedbackService } from "./feedback-service";

vi.mock("../repositories/feedback-repository", () => ({
  FeedbackRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  resend: {
    emails: { send: vi.fn() },
  },
}));

const BASE_INPUT = {
  userId: "user-1",
  email: "writer@example.com",
  category: "bug" as const,
  subject: "Editor jumps to top",
  message: "When I paste an image the cursor jumps to the top of the entry.",
};

describe("FeedbackService.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (FeedbackRepository.create as any).mockResolvedValue({ _id: "trace-123" });
    (resend.emails.send as any).mockResolvedValue({ id: "email-1" });
  });

  it("persists the feedback record before notifying the team", async () => {
    await FeedbackService.submit(BASE_INPUT);

    expect(FeedbackRepository.create).toHaveBeenCalledTimes(1);
    expect(FeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        email: "writer@example.com",
        category: "bug",
        subject: "Editor jumps to top",
      }),
    );
    expect(resend.emails.send).toHaveBeenCalledTimes(1);
  });

  it("sends the team notification with a category-prefixed subject and reply-to", async () => {
    await FeedbackService.submit(BASE_INPUT);

    const payload = (resend.emails.send as any).mock.calls[0][0];
    expect(payload.subject).toBe("[BUG] Editor jumps to top");
    expect(payload.replyTo).toBe("writer@example.com");
  });

  it("omits an empty imageUrl from the stored record", async () => {
    await FeedbackService.submit({ ...BASE_INPUT, imageUrl: "" });

    const stored = (FeedbackRepository.create as any).mock.calls[0][0];
    expect(stored.imageUrl).toBeUndefined();
  });

  it("still resolves successfully when the notification email fails", async () => {
    (resend.emails.send as any).mockRejectedValue(new Error("Resend down"));

    await expect(FeedbackService.submit(BASE_INPUT)).resolves.toBeUndefined();
    // The record was still persisted — the submission succeeded.
    expect(FeedbackRepository.create).toHaveBeenCalledTimes(1);
  });

  it("throws when persistence fails so the caller can surface an error", async () => {
    (FeedbackRepository.create as any).mockRejectedValue(new Error("DB down"));

    await expect(FeedbackService.submit(BASE_INPUT)).rejects.toThrow("DB down");
    expect(resend.emails.send).not.toHaveBeenCalled();
  });
});
