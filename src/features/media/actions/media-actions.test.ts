/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStorageStatsAction,
  getFullMediaLibraryAction,
  deleteMediaFileAction,
  findEntryForMediaAction,
} from "./media-actions";
import { auth } from "@/lib/auth";
import { r2 } from "@/lib/r2";
import { EntryModel } from "@/features/journal/repositories/entry-model";
import { EntryRepository } from "@/features/journal/repositories/entry-repository";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock LockService
vi.mock("@/features/lock/services/lock-service", () => ({
  LockService: {
    isSessionUnlocked: vi.fn().mockResolvedValue(true),
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
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
  const findMock = {
    lean: vi.fn().mockReturnThis(),
  };
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
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
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
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
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
        limitMB: 50,
        percentUsed: 30,
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
      const res = await deleteMediaFileAction("dev-journal/other-user/file.jpg");
      expect(res.success).toBe(false);
      expect(res.error).toBe("You are not authorized to delete this file.");
    });

    it("should delete from R2 and scrub Mongo entries when deleting file", async () => {
      vi.mocked(r2.send).mockResolvedValue({} as any);
      
      const mockEntries = [
        {
          _id: "entry-1",
          contentHtml: "This is a <img src=\"http://localhost:3000/r2/dev-journal/user-123/file.jpg\" /> image.",
          contentJson: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "image",
                attrs: { src: "http://localhost:3000/r2/dev-journal/user-123/file.jpg" },
              },
            ],
          }),
        },
      ];
      
      const leanMock = (EntryModel.find as any)().lean;
      leanMock.mockResolvedValue(mockEntries);

      const res = await deleteMediaFileAction("dev-journal/user-123/file.jpg");

      expect(res.success).toBe(true);
      expect(r2.send).toHaveBeenCalled();
      expect(EntryModel.updateOne).toHaveBeenCalledWith(
        { _id: "entry-1" },
        expect.objectContaining({
          contentHtml: expect.any(String),
          contentJson: expect.any(String),
        })
      );
      expect(EntryRepository.invalidateUserEntryCache).toHaveBeenCalledWith(mockUserId);
    });

    it("should find the corresponding entry date referencing a media URL", async () => {
      const mockEntries = [
        {
          date: "2026-07-06",
          contentHtml: "Here is the photo: http://localhost:3000/r2/dev-journal/user-123/photo.jpg",
        },
        {
          date: "2026-07-05",
          contentHtml: "No photo here.",
        },
      ];
      const leanMock = (EntryModel.find as any)().lean;
      leanMock.mockResolvedValue(mockEntries);

      const res = await findEntryForMediaAction("http://localhost:3000/r2/dev-journal/user-123/photo.jpg");
      expect(res.success).toBe(true);
      expect(res.date).toBe("2026-07-06");
    });
  });
});
