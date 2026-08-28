/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { r2 } from "@/lib/r2";
import { getRequestSession } from "@/lib/request-cache";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

import {
  deleteMediaFileAction,
  findEntryForMediaAction,
  getFullMediaLibraryAction,
  getStorageStatsAction,
} from "./media-actions";

// Mock LockService
vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    isSessionUnlocked: vi.fn().mockResolvedValue(true),
  },
}));

// Mock billing entitlements (per-tier media storage quota source)
vi.mock("@/features/billing/services/entitlements-service", () => ({
  EntitlementsService: {
    getEntitlements: vi.fn().mockResolvedValue({
      plan: "free",
      backfillDays: 14,
      mediaStorageBytes: 100 * 1024 * 1024,
      maxConcurrentSessions: 1,
      notebookLimit: 1,
      futureLetterLimit: 0,
      curatedThemes: false,
      proAppearance: false,
    }),
  },
}));

// Mock getRequestSession (never run the real cache()-wrapped implementation)
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
}));

// Mock r2 client
vi.mock("@/lib/r2", () => ({
  r2: {
    send: vi.fn(),
  },
}));

// Mock db mongoose connection
vi.mock("@/lib/db/mongoose", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock EntryModel Mongoose model
vi.mock("@/features/journal/repositories/entry-model", () => {
  const leanMock = vi.fn();
  const limitMock = { lean: leanMock };
  const sortMock = { limit: vi.fn().mockReturnValue(limitMock) };
  const findMock = { sort: vi.fn().mockReturnValue(sortMock) };
  return {
    EntryModel: {
      find: vi.fn().mockReturnValue(findMock),
      updateOne: vi.fn(),
    },
  };
});

// Mock EntryRepository
vi.mock("@/features/journal/repositories/entry-repository", () => ({
  EntryRepository: {
    invalidateUserEntryCache: vi.fn(),
  },
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  safeDecrypt: vi.fn((val) => val),
  encrypt: vi.fn((val) => val),
}));

describe("media-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-123";
  const mockSession = {
    user: {
      id: mockUserId,
    },
  };

  describe("unauthorized checks", () => {
    beforeEach(() => {
      vi.mocked(getRequestSession).mockResolvedValue(null);
    });

    it("should fail getStorageStatsAction if unauthorized", async () => {
      const res = await getStorageStatsAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail getFullMediaLibraryAction if unauthorized", async () => {
      const res = await getFullMediaLibraryAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail deleteMediaFileAction if unauthorized", async () => {
      const res = await deleteMediaFileAction("dev-journal/user-123/file.jpg");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fail findEntryForMediaAction if unauthorized", async () => {
      const res = await findEntryForMediaAction("http://r2-url/file.jpg");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });
  });

  describe("authorized behavior", () => {
    beforeEach(() => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
    });

    it("should compute storage stats correctly in getStorageStatsAction", async () => {
      vi.mocked(r2.send).mockResolvedValue({
        Contents: [
          { Key: "file1.jpg", Size: 1024 * 1024 * 5 }, // 5 MB
          { Key: "file2.jpg", Size: 1024 * 1024 * 10 }, // 10 MB
        ],
      } as any);

      const res = await getStorageStatsAction();
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        usedMB: 15,
        fileCount: 2,
        limitMB: 100, // Free tier quota from mocked entitlements
        percentUsed: 15,
      });
    });

    it("should list media library sorted by modified date in getFullMediaLibraryAction", async () => {
      vi.mocked(r2.send).mockResolvedValue({
        Contents: [
          {
            Key: "dev-journal/user-123/img1.jpg",
            Size: 500,
            LastModified: new Date("2026-07-06T10:00:00Z"),
          },
          {
            Key: "dev-journal/user-123/img2.jpg",
            Size: 1000,
            LastModified: new Date("2026-07-06T12:00:00Z"),
          },
        ],
      } as any);

      const res = await getFullMediaLibraryAction();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      // Sorted by last modified descending
      expect(res.data?.[0]?.key).toBe("dev-journal/user-123/img2.jpg");
    });

    it("should reject deleteMediaFileAction if file path does not belong to user", async () => {
      const res = await deleteMediaFileAction(
        "dev-journal/other-user/file.jpg",
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("You are not authorized to delete this file.");
    });

    it("should delete the file from R2 without touching Mongo (client scrubs entries)", async () => {
      vi.mocked(r2.send).mockResolvedValue({} as any);

      const res = await deleteMediaFileAction("dev-journal/user-123/file.jpg");

      expect(res.success).toBe(true);
      expect(r2.send).toHaveBeenCalledTimes(1);
      expect(EntryModel.find).not.toHaveBeenCalled();
      expect(EntryModel.updateOne).not.toHaveBeenCalled();
      expect(EntryRepository.invalidateUserEntryCache).not.toHaveBeenCalled();
    });

    it("should find the corresponding entry date referencing a media URL", async () => {
      const mockEntries = [
        {
          date: "2026-07-06",
          contentHtml:
            "Here is the photo: http://localhost:3000/r2/dev-journal/user-123/photo.jpg",
        },
        {
          date: "2026-07-05",
          contentHtml: "No photo here.",
        },
      ];
      const leanMock = (EntryModel.find as any)().sort().limit().lean;
      leanMock.mockResolvedValue(mockEntries);

      const res = await findEntryForMediaAction(
        "http://localhost:3000/r2/dev-journal/user-123/photo.jpg",
      );
      expect(res.success).toBe(true);
      expect(res.date).toBe("2026-07-06");
    });
  });
});
