import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IEntry extends Document {
  userId: string;
  date: string; // Format: YYYY-MM-DD
  title: string;
  contentHtml: string; // Encrypted text
  contentText: string; // Encrypted text
  contentJson: string; // Encrypted stringified JSON
  wordCount: number;
  mood: number | null; // Range: 1-5 or null
  createdAt: Date;
  updatedAt: Date;
}

const EntrySchema = new Schema<IEntry>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    title: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    contentText: { type: String, default: "" },
    contentJson: { type: String, default: "" },
    wordCount: { type: Number, default: 0 },
    mood: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true },
);

// Unique index to prevent duplicate entries per user per day. Also serves
// ascending reads (insights full-table scan, export) which sort by `date: 1`.
EntrySchema.index({ userId: 1, date: 1 }, { unique: true });

// Compound index for the dominant listed reads: the entries timeline, calendar
// dates, and paginated dashboard queries all filter by `userId` and sort by
// `date: -1`. This avoids an in-memory sort on those hot paths.
EntrySchema.index({ userId: 1, date: -1 });

export const EntryModel =
  mongoose.models.Entry || mongoose.model<IEntry>("Entry", EntrySchema);
