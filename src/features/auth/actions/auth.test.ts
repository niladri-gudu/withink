import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIdentityExists } from "./auth";
import { connectDB } from "@/lib/db/mongoose";
import mongoose from "mongoose";

// Use vi.hoisted to declare mock functions before they are referenced in the hoisted vi.mock
const { mockFindOne, mockCollection } = vi.hoisted(() => {
  const findOne = vi.fn();
  const collection = vi.fn(() => ({
    findOne,
  }));
  return { mockFindOne: findOne, mockCollection: collection };
});

vi.mock("@/lib/db/mongoose", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", async (importOriginal) => {
  const original = await importOriginal<typeof import("mongoose")>();
  return {
    ...original,
    default: {
      ...original.default,
      connection: {
        db: {
          collection: mockCollection,
        },
      },
    },
  };
});

describe("auth actions - checkIdentityExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should connect to the database and query the user collection with lowercased email", async () => {
    mockFindOne.mockResolvedValue({ _id: "user-1", email: "user@example.com" });

    const result = await checkIdentityExists("User@Example.Com");

    expect(connectDB).toHaveBeenCalled();
    expect(mockCollection).toHaveBeenCalledWith("user");
    expect(mockFindOne).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(result).toBe(true);
  });

  it("should return false if the user document is not found", async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await checkIdentityExists("notfound@example.com");

    expect(mockFindOne).toHaveBeenCalledWith({ email: "notfound@example.com" });
    expect(result).toBe(false);
  });
});
