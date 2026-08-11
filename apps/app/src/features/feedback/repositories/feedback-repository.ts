import { connectDB } from "@/lib/db/mongoose";
import { serialize } from "@/lib/utils/serialize";

import { FeedbackModel, type IFeedback } from "./feedback-model";

export type CreateFeedbackData = {
  userId: string;
  email: string;
  category: IFeedback["category"];
  subject: string;
  message: string;
  imageUrl?: string;
};

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
