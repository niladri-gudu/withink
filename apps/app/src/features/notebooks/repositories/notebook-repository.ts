import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { serialize } from "@/lib/utils/serialize";

import { NotebookModel, type INotebook } from "./notebook-model";

/**
 * A plain, serialized notebook document — ObjectIds and Dates flattened so
 * these records can flow into Server Action payloads and Redis safely.
 */
export interface NotebookRecord {
  id: string;
  userId: string;
  name: string;
  nameLower: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function toRecord(doc: unknown): NotebookRecord {
  const plain = serialize(doc) as {
    _id?: string;
    userId?: string;
    name?: string;
    nameLower?: string;
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  return {
    id: String(plain._id ?? ""),
    userId: plain.userId ?? "",
    name: plain.name ?? "",
    nameLower: plain.nameLower ?? "",
    isDefault: plain.isDefault ?? false,
    createdAt: new Date(plain.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(plain.updatedAt ?? Date.now()).toISOString(),
  };
}

/**
 * Pure persistence for notebooks. No caching here — the collection is tiny
 * (bounded by the plan's notebook limit) and always read through the
 * service, which owns bootstrap and cross-feature coordination.
 */
export class NotebookRepository {
  /**
   * All of a user's notebooks, default first, then oldest-created first.
   * The ordering IS the promotion policy: when a default is deleted, the
   * oldest survivor becomes the new default.
   */
  static async listByUserId(userId: string): Promise<NotebookRecord[]> {
    await connectDB();
    const docs = await (NotebookModel as Model<INotebook>)
      .find({ userId })
      .sort({ isDefault: -1, createdAt: 1 })
      .lean();
    return docs.map(toRecord);
  }

  static async getById(
    userId: string,
    notebookId: string,
  ): Promise<NotebookRecord | null> {
    if (!notebookId) return null;
    await connectDB();
    const doc = await (NotebookModel as Model<INotebook>)
      .findOne({ _id: notebookId, userId })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  static async getDefault(userId: string): Promise<NotebookRecord | null> {
    await connectDB();
    const doc = await (NotebookModel as Model<INotebook>)
      .findOne({ userId, isDefault: true })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  /** Inserts one notebook. Throws on duplicate `nameLower` for the user. */
  static async create(
    userId: string,
    name: string,
    isDefault: boolean,
  ): Promise<NotebookRecord> {
    await connectDB();
    const doc = await (NotebookModel as Model<INotebook>).create({
      userId,
      name,
      nameLower: name.toLowerCase(),
      isDefault,
    });
    return toRecord(doc.toObject() as INotebook);
  }

  static async setName(
    userId: string,
    notebookId: string,
    name: string,
  ): Promise<void> {
    await connectDB();
    await (NotebookModel as Model<INotebook>).updateOne(
      { _id: notebookId, userId },
      { $set: { name, nameLower: name.toLowerCase() } },
    );
  }

  /** Flags exactly one notebook as the default, clearing all others. */
  static async setDefault(userId: string, notebookId: string): Promise<void> {
    await connectDB();
    await (NotebookModel as Model<INotebook>).updateMany(
      { userId },
      { $set: { isDefault: false } },
    );
    await (NotebookModel as Model<INotebook>).updateOne(
      { _id: notebookId, userId },
      { $set: { isDefault: true } },
    );
  }

  static async delete(userId: string, notebookId: string): Promise<void> {
    await connectDB();
    await (NotebookModel as Model<INotebook>).deleteOne({
      _id: notebookId,
      userId,
    });
  }
}
