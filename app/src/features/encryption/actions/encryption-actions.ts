"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { ClientEncryptionSettingsModel } from "../repositories/encryption-settings-model";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";
import { safeDecrypt } from "@/lib/encryption";
import { handleError } from "@/server/errors";

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();
    const settings = await (ClientEncryptionSettingsModel as any).findOne({
      userId: session.user.id,
    }).lean();

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
    contentJson: any;
    mood: number | null;
  }>;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();
    
    // Safety check: Do not export plaintext if zero-knowledge is already enabled
    const settings = await (ClientEncryptionSettingsModel as any).findOne({
      userId: session.user.id,
    }).lean();
    if (settings?.isClientEncrypted) {
      return { success: false, error: "Client-side encryption is already active" };
    }

    // Fetch all entries for the user
    const entries = await EntryRepository.getAllEntries(session.user.id);
    
    // Decrypt on the server using the static server key
    const decryptedEntries = entries.map((entry: any) => {
      const contentHtml = (safeDecrypt(entry.contentHtml) as string) || "";
      const contentText = (safeDecrypt(entry.contentText) as string) || "";
      const decryptedJsonStr = (safeDecrypt(entry.contentJson) as string) || "";
      let contentJson: any = {};
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

export async function enableClientEncryptionAction(
  salt: string,
  verificationCiphertext: string,
  encryptedEntries: Array<{
    id: string;
    contentHtml: string;
    contentText: string;
    contentJson: string;
    wordCount: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();

    // Check if ZK is already active
    const settings = await (ClientEncryptionSettingsModel as any).findOne({
      userId: session.user.id,
    }).lean();
    if (settings?.isClientEncrypted) {
      return { success: false, error: "Client-side encryption is already active" };
    }

    // Update settings to enable ZK
    await (ClientEncryptionSettingsModel as any).findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          isClientEncrypted: true,
          encryptionSalt: salt,
          verificationCiphertext,
        },
      },
      { upsert: true, new: true }
    );

    // Save newly encrypted entry blobs in database
    for (const entry of encryptedEntries) {
      await (EntryModel as any).updateOne(
        { _id: entry.id, userId: session.user.id },
        {
          $set: {
            contentHtml: entry.contentHtml,
            contentText: entry.contentText,
            contentJson: entry.contentJson,
            wordCount: entry.wordCount,
          },
        }
      );
    }

    // Invalidate entries cache
    await EntryRepository.invalidateUserEntryCache(session.user.id);

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

export async function updateSanctuaryPasswordAction(
  verificationCiphertext: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();

    const result = await (ClientEncryptionSettingsModel as any).updateOne(
      { userId: session.user.id, isClientEncrypted: true },
      { $set: { verificationCiphertext } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Client-side encryption is not enabled for this user" };
    }

    return { success: true };
  } catch (err) {
    const appError = handleError(err);
    return { success: false, error: appError.safeMessage };
  }
}

