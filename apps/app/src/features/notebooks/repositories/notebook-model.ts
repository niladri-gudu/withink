import mongoose, { Schema, type Document } from "mongoose";

/**
 * One named journal on a user's shelf. Entries are FILED into notebooks
 * (one entry per calendar day globally — see PRD §27), so a notebook only
 * ever groups entries; it never changes the per-day uniqueness rule.
 *
 * Created lazily: a user's default notebook ("Journal") is bootstrapped by
 * NotebookService.ensureBootstrapped the first time notebooks are read,
 * along with a one-time backfill of legacy entries (notebookId null).
 */
export interface INotebook extends Document {
  userId: string;
  /** Display name, trimmed, 1–60 chars. */
  name: string;
  /** Lowercased copy of `name` backing case-insensitive per-user uniqueness. */
  nameLower: string;
  /**
   * Exactly one notebook per user is the default: where new entries are
   * filed when no explicit choice was made. Deleting the default promotes
   * the oldest survivor instead of leaving none.
   */
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotebookSchema = new Schema<INotebook>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameLower: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Case-insensitive per-user uniqueness. Also settles the concurrent
// bootstrap race: two devices creating the default at once yields exactly
// one row (the loser catches the duplicate-key error and reuses the row).
NotebookSchema.index({ userId: 1, nameLower: 1 }, { unique: true });

export const NotebookModel =
  mongoose.models.Notebook ||
  mongoose.model<INotebook>("Notebook", NotebookSchema);
