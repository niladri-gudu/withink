import mongoose, { Schema, type Document } from "mongoose";

/**
 * A letter to the writer's future self. Composition date is implicit in
 * `createdAt`; `unlockDate` is the viewer-local day the letter becomes
 * readable ("sealed" until then).
 *
 * Zero-knowledge: on ZK accounts every text field arrives as client-encrypted
 * ciphertext and the server stores it verbatim — it can never decrypt, same
 * contract as journal entries. Legacy plaintext accounts store readable text.
 */
export interface ILetter extends Document {
  userId: string;
  /** Viewer-local YYYY-MM-DD the letter opens on. Strictly future at write. */
  unlockDate: string;
  title: string;
  contentHtml: string;
  contentText: string;
  /** Tiptap JSON object (legacy/plaintext) or its client-encrypted JSON string. */
  contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  wordCount: number;
  /** False while the writer is still composing (auto-saved drafts). */
  sealed: boolean;
  /** Stamped the first time a delivered letter is revealed; drives arrival badges. */
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LetterSchema = new Schema<ILetter>(
  {
    userId: { type: String, required: true, index: true },
    unlockDate: { type: String, required: true },
    title: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    contentText: { type: String, default: "" },
    contentJson: { type: Schema.Types.Mixed, default: {} },
    wordCount: { type: Number, default: 0 },
    sealed: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The letters page bands "sealed vs arrived" and both sort inside themselves;
// one compound index covers every per-user scan.
LetterSchema.index({ userId: 1, unlockDate: -1 });

export const LetterModel =
  mongoose.models.Letter || mongoose.model<ILetter>("Letter", LetterSchema);
