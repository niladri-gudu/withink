/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { client } from "@/lib/db";
import { r2 } from "@/lib/r2";
import { getRequestSession } from "@/lib/request-cache";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

import { deleteAccountAction } from "./settings-actions";

// Mock getRequestSession (never run the real cache()-wrapped implementation)
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

// Mock r2
vi.mock("@/lib/r2", () => ({
  r2: {
    send: vi.fn(),
  },
}));

// Mock db client
vi.mock("@/lib/db", () => {
  const mockDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
  const mockDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });
  // Default: no credential account (OAuth-only user) so the password
  // re-authentication step is skipped in these tests.
  const mockFindOne = vi.fn().mockResolvedValue(null);
  const mockCollection = vi.fn().mockReturnValue({
    deleteOne: mockDeleteOne,
    deleteMany: mockDeleteMany,
    findOne: mockFindOne,
  });
  const mockDb = vi.fn().mockReturnValue({
    collection: mockCollection,
  });

  return {
    client: {
      db: mockDb,
    },
    DB_NAME: "withink_dev",
  };
});

// Mock mongoose db connection
vi.mock("@/lib/db/mongoose", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock EntryModel
vi.mock("@/features/journal/repositories/entry-model", () => ({
  EntryModel: {
    deleteMany: vi.fn(),
  },
}));

// Mock EntryRepository
vi.mock("@/features/journal/repositories/entry-repository", () => ({
  EntryRepository: {
    invalidateUserEntryCache: vi.fn(),
  },
}));

// Mock the additional purged collections (lock, encryption settings, feedback)
vi.mock("@/features/lock/repositories/lock-model", () => ({
  LockSettingsModel: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  },
}));

vi.mock("@/features/encryption/repositories/encryption-settings-model", () => ({
  ClientEncryptionSettingsModel: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  },
}));

vi.mock("@/features/feedback/repositories/feedback-model", () => ({
  FeedbackModel: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  },
}));

vi.mock("@/features/letters/repositories/letter-model", () => ({
  LetterModel: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  },
}));

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-123";
  const mockSession = {
    user: {
      id: mockUserId,
      name: "Test Writer",
      email: "writer@withink.me",
      image: "https://assets.withink.me/avatars/user-123/avatar.jpg",
    },
  };

  it("should fail and return Unauthorized if user session is missing", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null);

    const result = await deleteAccountAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(EntryModel.deleteMany).not.toHaveBeenCalled();
  });

  it("should delete MongoDB entries, clean R2 objects, purge Better Auth records, and invalidate cache on success", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(EntryModel.deleteMany).mockResolvedValue({
      deletedCount: 5,
    } as any);

    // Mock R2 listing and deleting responses
    vi.mocked(r2.send).mockImplementation(async (command: any) => {
      // ListObjectsV2Command
      if (command.constructor.name === "ListObjectsV2Command") {
        return {
          Contents: [
            { Key: "dev-journal/user-123/image1.webp" },
            { Key: "dev-journal/user-123/image2.webp" },
          ],
        };
      }
      // DeleteObjectsCommand
      return { Deleted: [{ Key: "image1.webp" }, { Key: "image2.webp" }] };
    });

    const result = await deleteAccountAction();

    // Verify success
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify database deletes
    expect(EntryModel.deleteMany).toHaveBeenCalledWith({ userId: mockUserId });
    expect(EntryRepository.invalidateUserEntryCache).toHaveBeenCalledWith(
      mockUserId,
    );

    // Verify Direct Mongo calls for Better Auth collections
    const dbMock = client.db();
    expect(dbMock.collection).toHaveBeenCalledWith("user");
    expect(dbMock.collection).toHaveBeenCalledWith("session");
    expect(dbMock.collection).toHaveBeenCalledWith("account");

    const userColl = dbMock.collection("user");
    expect(userColl.deleteOne).toHaveBeenCalled();
    const sessionColl = dbMock.collection("session");
    expect(sessionColl.deleteMany).toHaveBeenCalledWith({ userId: mockUserId });
  });

  it("should succeed even if R2 bucket is empty", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(EntryModel.deleteMany).mockResolvedValue({
      deletedCount: 0,
    } as any);

    // Mock empty list objects response from R2
    vi.mocked(r2.send).mockResolvedValue({ Contents: [] } as any);

    const result = await deleteAccountAction();

    expect(result.success).toBe(true);
    expect(EntryModel.deleteMany).toHaveBeenCalled();
  });

  it("should handle error gracefully and return standard error payload if an exception occurs", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    vi.mocked(EntryModel.deleteMany).mockRejectedValue(
      new Error("Database connection dropped"),
    );

    const result = await deleteAccountAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "An unexpected error occurred. Please try again later.",
    );
  });
});
