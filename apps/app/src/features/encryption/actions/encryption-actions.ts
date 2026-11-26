"use server";

import type { Model } from "mongoose";
import { z } from "zod";

import { isUnlockedForRequest } from "@/lib/api-auth";
import { isClientCiphertext } from "@/lib/ciphertext";
import { connectDB } from "@/lib/db/mongoose";
import { safeDecrypt } from "@/lib/encryption";
import { normalizeKdfIterations } from "@/lib/kdf";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import {
  EntryModel,
  type IEntry,
} from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";
import { LockRepository } from "@/features/lock/repositories/lock-repository";
import { LockService } from "@/features/lock/services/lock-service";

import {
  ClientEncryptionSettingsModel,
  type IClientEncryptionSettings,
} from "../repositories/encryption-settings-model";
import { EncryptionSettingsRepository } from "../repositories/encryption-settings-repository";

export async function getEncryptionSettingsAction(): Promise<{
  success: boolean;
  data?: {
    isClientEncrypted: boolean;
    encryptionSalt: string;
    verificationCiphertext: string;
    kdfIterations: number;
  };
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();
    const settings = await EncryptionSettingsRepository.getSettings(
      session.user.id,
    );

    if (!settings) {
      return {
        success: true,
        data: {
          isClientEncrypted: false,
          encryptionSalt: "",
          verificationCiphertext: "",
          kdfIterations: normalizeKdfIterations(undefined),
        },
      };
    }

    return {
      success: true,
      data: {
        isClientEncrypted: settings.isClientEncrypted,
        encryptionSalt: settings.encryptionSalt,
        verificationCiphertext: settings.verificationCiphertext,
        kdfIterations: normalizeKdfIterations(settings.kdfIterations),
      },
    };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function getPlaintextEntriesForMigrationAction(): Promise<{
  success: boolean;
  entries?: Array<{
    id: string;
    date: string;
    title: string;
    contentHtml: string;
    contentText: string;
    contentJson: unknown;
    mood: number | null;
  }>;
  error?: string;
}> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (!(await isUnlockedForRequest(session.user.id))) {
      return { success: false, error: "Locked" };
    }

    await connectDB();

    // Safety check: Do not export plaintext if zero-knowledge is already enabled
    const settings = await EncryptionSettingsRepository.getSettings(
      session.user.id,
    );
    if (settings?.isClientEncrypted) {
      return {
        success: false,
        error: "Client-side encryption is already active",
      };
    }

    // Fetch all entries for the user
    const entries = await EntryRepository.getAllEntries(session.user.id);

    // Decrypt on the server using the static server key
    const decryptedEntries = entries.map((entry) => {
      const contentHtml = (safeDecrypt(entry.contentHtml) as string) || "";
      const contentText = (safeDecrypt(entry.contentText) as string) || "";
      const decryptedJsonStr = (safeDecrypt(entry.contentJson) as string) || "";
      let contentJson: unknown = {};
      if (decryptedJsonStr) {
        try {
          contentJson = JSON.parse(decryptedJsonStr);
        } catch {
          contentJson = {};
        }
      }

      return {
        id: entry._id.toString(),
        date: entry.date,
        title: entry.title || "",
        contentHtml,
        contentText,
        contentJson,
        mood: entry.mood ?? null,
      };
    });

    return { success: true, entries: decryptedEntries };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

interface EncryptedEntryInput {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson: string;
  wordCount: number;
}

// Server Action args are attacker-controlled: bound each blob's size and
// shape so a crafted payload can't smuggle unbounded strings into Mongo.
const encryptedEntriesSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      title: z.string().max(500_000),
      contentHtml: z.string().max(2_000_000),
      contentText: z.string().max(1_000_000),
      contentJson: z.string().max(2_000_000),
      wordCount: z.number().int().min(0).max(1_000_000),
    }),
  )
  .max(10_000);

export async function enableClientEncryptionAction(
  salt: string,
  verificationCiphertext: string,
  encryptedEntries: EncryptedEntryInput[],
  unlockProof?: string,
  kdfIterations?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const parsedEntries = encryptedEntriesSchema.safeParse(encryptedEntries);
    if (!parsedEntries.success) {
      return { success: false, error: "Invalid migration payload." };
    }

    if (!(await isUnlockedForRequest(session.user.id))) {
      return { success: false, error: "Locked" };
    }

    await connectDB();

    // Check ZK is already active
    const settings = await EncryptionSettingsRepository.getSettings(
      session.user.id,
    );
    if (settings?.isClientEncrypted) {
      return {
        success: false,
        error: "Client-side encryption is already active",
      };
    }

    // Validate the salt (16 random bytes as 32 hex chars)
    if (typeof salt !== "string" || !/^[0-9a-f]{32}$/i.test(salt)) {
      return { success: false, error: "Invalid encryption salt." };
    }

    // Validate the verification ciphertext ("iv:ciphertext", both hex)
    const isHex = (value: string) => /^[0-9a-f]+$/i.test(value);
    const cipherParts =
      typeof verificationCiphertext === "string"
        ? verificationCiphertext.split(":")
        : [];
    if (
      cipherParts.length < 2 ||
      cipherParts.some((part) => part === "" || !isHex(part))
    ) {
      return { success: false, error: "Invalid verification ciphertext." };
    }

    // Verify every entry was migrated before enabling zero-knowledge
    const totalEntries = await (EntryModel as Model<IEntry>).countDocuments({
      userId: session.user.id,
    });
    const validEntries = parsedEntries.data;
    if (validEntries.length !== totalEntries) {
      return {
        success: false,
        error: "Some entries were not migrated. Please try again.",
      };
    }

    // Save newly encrypted entry blobs in database FIRST and verify every
    // entry was rewritten BEFORE flipping isClientEncrypted — enabling the
    // flag before the writes are confirmed would leave an account marked ZK
    // with partially plaintext entries on a mid-loop failure. Batched with
    // bulkWrite so the migration is a handful of round trips instead of N+1.
    const BATCH_SIZE = 500;
    let migratedCount = 0;
    for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
      const batch = validEntries.slice(i, i + BATCH_SIZE);
      const result = await (EntryModel as Model<IEntry>).bulkWrite(
        batch.map((entry) => ({
          updateOne: {
            filter: { _id: entry.id, userId: session.user.id },
            update: {
              $set: {
                title: entry.title,
                contentHtml: entry.contentHtml,
                contentText: entry.contentText,
                contentJson: entry.contentJson,
                wordCount: entry.wordCount,
              },
            },
          },
        })),
      );
      migratedCount += result.matchedCount || 0;
    }

    if (migratedCount !== totalEntries) {
      return {
        success: false,
        error: "Could not verify that all entries were migrated.",
      };
    }

    // Update settings to enable ZK — only after migration is verified.
    await EncryptionSettingsRepository.saveSettings(session.user.id, {
      isClientEncrypted: true,
      encryptionSalt: salt,
      verificationCiphertext,
      kdfIterations: normalizeKdfIterations(kdfIterations),
    });

    // Bind the unlock proof (sha256 of the master-key-derived subkey) so the
    // diary lock's unlock cookie can only be minted with possession of the
    // master key. Optional for backward compatibility.
    if (
      typeof unlockProof === "string" &&
      /^[0-9a-fA-F]{64}$/.test(unlockProof)
    ) {
      await LockRepository.saveSettings(session.user.id, {
        unlockProofHash: LockService.hashUnlockProof(unlockProof),
      });
    }

    // Invalidate entries cache
    await EntryRepository.invalidateUserEntryCache(session.user.id);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

const UNLOCK_PROOF_HEX = /^[0-9a-fA-F]{64}$/;
const MAX_VERIFICATION_CIPHERTEXT_LENGTH = 512;

export async function updateDiaryPasswordAction(
  verificationCiphertext: string,
  unlockProof: string,
  kdfIterations?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // The wrapped master key is the root of every entry's encryption: a caller
    // may only replace it after proving they still hold that master key. A
    // stolen session (or a locked diary) must never be enough.
    if (
      typeof verificationCiphertext !== "string" ||
      !isClientCiphertext(verificationCiphertext) ||
      verificationCiphertext.length > MAX_VERIFICATION_CIPHERTEXT_LENGTH
    ) {
      return { success: false, error: "Invalid verification ciphertext." };
    }

    if (!(await isUnlockedForRequest(session.user.id))) {
      return { success: false, error: "Locked" };
    }

    if (
      typeof unlockProof !== "string" ||
      !UNLOCK_PROOF_HEX.test(unlockProof)
    ) {
      return { success: false, error: "Invalid unlock proof." };
    }

    const lockSettings = await LockRepository.getSettings(session.user.id);
    if (!lockSettings?.unlockProofHash) {
      // Legacy zero-knowledge accounts must complete the one-time email-code
      // binding flow before rotating; otherwise there is nothing to verify.
      return { success: false, error: "UNLOCK_PROOF_NOT_BOUND" };
    }

    if (
      !LockService.verifyUnlockProofHash(
        unlockProof,
        lockSettings.unlockProofHash,
      )
    ) {
      const limit = await rateLimit(`lock:change-password:${session.user.id}`, {
        limit: 10,
        windowSeconds: 300,
        failClosed: true,
      });
      if (!limit.success) {
        return {
          success: false,
          error: "Too many attempts. Please try again in 5 minutes.",
        };
      }
      return { success: false, error: "Unlock verification failed." };
    }

    await connectDB();

    const result = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    ).updateOne(
      { userId: session.user.id, isClientEncrypted: true },
      {
        $set: {
          verificationCiphertext,
          kdfIterations: normalizeKdfIterations(kdfIterations),
        },
      },
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: "Client-side encryption is not enabled for this user",
      };
    }

    await EncryptionSettingsRepository.invalidateCache(session.user.id);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}
