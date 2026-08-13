"use server";

import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { safeDecrypt } from "@/lib/encryption";
import { getRequestSession } from "@/lib/request-cache";
import { handleError } from "@/server/errors";
import {
  EntryModel,
  type IEntry,
} from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";
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
        },
      };
    }

    return {
      success: true,
      data: {
        isClientEncrypted: settings.isClientEncrypted,
        encryptionSalt: settings.encryptionSalt,
        verificationCiphertext: settings.verificationCiphertext,
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

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
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

export async function enableClientEncryptionAction(
  salt: string,
  verificationCiphertext: string,
  encryptedEntries: EncryptedEntryInput[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const unlocked = await LockService.isSessionUnlocked(session.user.id);
    if (!unlocked) {
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
    if (encryptedEntries.length !== totalEntries) {
      return {
        success: false,
        error: "Some entries were not migrated. Please try again.",
      };
    }

    // Update settings to enable ZK
    await EncryptionSettingsRepository.saveSettings(session.user.id, {
      isClientEncrypted: true,
      encryptionSalt: salt,
      verificationCiphertext,
    });

    // Save newly encrypted entry blobs in database
    let migratedCount = 0;
    for (const entry of encryptedEntries) {
      const res = await (EntryModel as Model<IEntry>).updateOne(
        { _id: entry.id, userId: session.user.id },
        {
          $set: {
            title: entry.title,
            contentHtml: entry.contentHtml,
            contentText: entry.contentText,
            contentJson: entry.contentJson,
            wordCount: entry.wordCount,
          },
        },
      );
      if (res.matchedCount > 0) migratedCount++;
    }

    if (migratedCount !== totalEntries) {
      return {
        success: false,
        error: "Could not verify that all entries were migrated.",
      };
    }

    // Invalidate entries cache
    await EntryRepository.invalidateUserEntryCache(session.user.id);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function updateDiaryPasswordAction(
  verificationCiphertext: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getRequestSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();

    const result = await (
      ClientEncryptionSettingsModel as Model<IClientEncryptionSettings>
    ).updateOne(
      { userId: session.user.id, isClientEncrypted: true },
      { $set: { verificationCiphertext } },
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
