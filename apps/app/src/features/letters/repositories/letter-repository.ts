import "server-only";

import mongoose, { type Model } from "mongoose";

import type { ILetter } from "./letter-model";
import { LetterModel } from "./letter-model";

// The `mongoose.models.Letter ||` union confuses overload resolution; one
// cast to the concrete model type restores it (same as notebook-repository).
const LetterDocModel = LetterModel as Model<ILetter>;

/** List projection — never carries letter bodies into RSC streams needlessly. */
export interface LetterMetaRecord {
  id: string;
  unlockDate: string;
  /** Ciphertext on ZK accounts; plaintext otherwise. */
  title: string;
  wordCount: number;
  sealed: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LetterFullRecord extends LetterMetaRecord {
  contentHtml: string;
  contentText: string;
  contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface SaveLetterFields {
  unlockDate?: string;
  sealed?: boolean;
  title?: string;
  contentHtml?: string;
  contentText?: string;
  contentJson?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  wordCount?: number;
}

function toId(doc: ILetter): string {
  return doc._id ? (doc._id as unknown as mongoose.Types.ObjectId).toString() : "";
}

function toMeta(doc: ILetter): LetterMetaRecord {
  return {
    id: toId(doc),
    unlockDate: doc.unlockDate,
    title: doc.title ?? "",
    wordCount: doc.wordCount ?? 0,
    sealed: !!doc.sealed,
    readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function toFull(doc: ILetter): LetterFullRecord {
  return {
    ...toMeta(doc),
    contentHtml: doc.contentHtml ?? "",
    contentText: doc.contentText ?? "",
    contentJson: doc.contentJson ?? {},
  };
}

/**
 * Persistence-only boundary for letters to the future self. Every method is
 * user-scoped by construction — ids never reach a query without userId.
 */
export const LetterRepository = {
  async listMeta(userId: string): Promise<LetterMetaRecord[]> {
    const docs = (await LetterDocModel.find({ userId })
      .select("-contentHtml -contentText -contentJson")
      .lean()) as unknown as ILetter[];
    return docs.map(toMeta);
  },

  async getFullById(
    userId: string,
    letterId: string,
  ): Promise<LetterFullRecord | null> {
    if (!mongoose.isValidObjectId(letterId)) return null;
    const doc = (await LetterDocModel.findOne({
      _id: letterId,
      userId,
    }).lean()) as unknown as ILetter | null;
    return doc ? toFull(doc) : null;
  },

  async createDoc(
    userId: string,
    fields: SaveLetterFields & { unlockDate: string },
  ): Promise<LetterFullRecord> {
    const doc = await LetterDocModel.create({ userId, ...fields });
    return toFull(doc);
  },

  async updateDoc(
    userId: string,
    letterId: string,
    fields: SaveLetterFields,
  ): Promise<LetterFullRecord | null> {
    if (!mongoose.isValidObjectId(letterId)) return null;
    const doc = (await LetterDocModel.findOneAndUpdate(
      { _id: letterId, userId },
      { $set: fields },
      { new: true, runValidators: false },
    ).lean()) as unknown as ILetter | null;
    return doc ? toFull(doc) : null;
  },

  async deleteById(userId: string, letterId: string): Promise<void> {
    if (!mongoose.isValidObjectId(letterId)) return;
    await LetterDocModel.deleteOne({ _id: letterId, userId });
  },

  /**
   * Active (slot-occupying) letters = not yet delivered. Unlock dates are
   * plain YYYY-MM-DD strings, so lexicographic comparison is exact.
   */
  async countActive(userId: string, today: string): Promise<number> {
    return LetterDocModel.countDocuments({
      userId,
      unlockDate: { $gt: today },
    });
  },

  /** Stamp readAt the first time a delivered letter is opened. */
  async markReadIfUnread(
    userId: string,
    letterId: string,
  ): Promise<void> {
    if (!mongoose.isValidObjectId(letterId)) return;
    await LetterDocModel.updateOne(
      { _id: letterId, userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
  },

  /** Powers the dashboard arrival note (delivered and still unopened). */
  async listArrivedUnread(
    userId: string,
    today: string,
    limit = 5,
  ): Promise<LetterMetaRecord[]> {
    const docs = (await LetterDocModel.find({
      userId,
      unlockDate: { $lte: today },
      readAt: null,
    })
      .select("-contentHtml -contentText -contentJson")
      .sort({ unlockDate: -1, createdAt: -1 })
      .limit(limit)
      .lean()) as unknown as ILetter[];
    return docs.map(toMeta);
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await LetterDocModel.deleteMany({ userId });
  },
};
