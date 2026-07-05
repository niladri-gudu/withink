import { FeedbackModel } from "./feedback-model";
import type { IFeedback } from "./feedback-model";
import { connectDB } from "@/lib/db/mongoose";

export type CreateFeedbackData = {
  userId: string;
  email: string;
  category: IFeedback["category"];
  subject: string;
  message: string;
  imageUrl?: string;
};

function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Owns persistence for feedback records. No business rules live here — the
 * service decides what to do with a submission; the repository only stores it.
 */
export class FeedbackRepository {
  static async create(data: CreateFeedbackData): Promise<IFeedback> {
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (FeedbackModel as any).create(data);
    return serialize(created.toObject());
  }
}
