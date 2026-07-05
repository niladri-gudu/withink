import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import { FEEDBACK_CATEGORIES } from "../validation/feedback-schema";

export type FeedbackStatus = "pending" | "reviewed" | "resolved";

export interface IFeedback extends Document {
  userId: string;
  email: string;
  category: (typeof FEEDBACK_CATEGORIES)[number];
  subject: string;
  message: string;
  imageUrl?: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    category: {
      type: String,
      enum: FEEDBACK_CATEGORIES,
      required: true,
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const FeedbackModel =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);
