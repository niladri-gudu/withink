import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENTITLEMENTS } from "../config/plans";
import { EntitlementsService } from "./entitlements-service";
import { SessionCapService } from "./session-cap-service";

const { mockSessionCollection, mockUserCollection, resendMock, loggerMock } =
  vi.hoisted(() => ({
    mockSessionCollection: {
      countDocuments: vi.fn(),
      find: vi.fn(),
      deleteMany: vi.fn(),
    },
    mockUserCollection: {
      findOne: vi.fn(),
    },
    resendMock: {
      emails: { send: vi.fn() },
    },
    loggerMock: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }));

// Mock entitlements (the cap source)
vi.mock("./entitlements-service", () => ({
  EntitlementsService: {
    getEntitlements: vi.fn(),
  },
}));

// Mock Mongo client + db/collection chain
vi.mock("@/lib/db", () => ({
  client: {
    db: vi.fn(() => ({
      collection: (name: string) =>
        name === "user" ? mockUserCollection : mockSessionCollection,
    })),
  },
  DB_NAME: "withink_dev",
}));

// Mock email + logger (never hit the network in tests)
vi.mock("@/lib/email", () => ({ resend: resendMock }));
vi.mock("@/server/logger", () => ({ logger: loggerMock }));

const mockedGetEntitlements = vi.mocked(EntitlementsService.getEntitlements);
const mockedCountDocuments = mockSessionCollection.countDocuments;
const mockedDeleteMany = mockSessionCollection.deleteMany;
const mockedSend = resendMock.emails.send;

function mockOldestSessions(ids: string[]) {
  mockSessionCollection.find.mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    project: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(ids.map((id) => ({ _id: id }))),
  });
}

describe("SessionCapService.enforceOnSessionCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCollection.findOne.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "t@t.co",
    });
    mockedSend.mockResolvedValue({ id: "email-1" } as never);
  });

  it("skips entirely for an unlimited cap (Pro/Lifetime)", async () => {
    mockedGetEntitlements.mockResolvedValue(ENTITLEMENTS.pro);

    await SessionCapService.enforceOnSessionCreate("user-1");

    expect(mockedCountDocuments).not.toHaveBeenCalled();
    expect(mockedDeleteMany).not.toHaveBeenCalled();
  });

  it("does nothing while the session count is within the cap", async () => {
    mockedGetEntitlements.mockResolvedValue(ENTITLEMENTS.free);
    mockedCountDocuments.mockResolvedValue(1);

    await SessionCapService.enforceOnSessionCreate("user-1");

    expect(mockedDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes exactly the excess oldest sessions (FIFO)", async () => {
    mockedGetEntitlements.mockResolvedValue(ENTITLEMENTS.plus); // cap 3
    mockedCountDocuments.mockResolvedValue(5);
    mockOldestSessions(["old-1", "old-2"]);
    mockedDeleteMany.mockResolvedValue({ deletedCount: 2 } as never);

    await SessionCapService.enforceOnSessionCreate("user-1");

    expect(mockedDeleteMany).toHaveBeenCalledWith({
      _id: { $in: ["old-1", "old-2"] },
    });
    // The courtesy email fires once per soft-kick.
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "t@t.co",
        subject: "New device signed in · withink.",
      }),
    );
  });

  it("skips the notice email when nothing was deleted", async () => {
    mockedGetEntitlements.mockResolvedValue(ENTITLEMENTS.free); // cap 1
    mockedCountDocuments.mockResolvedValue(3);
    mockOldestSessions(["old-1", "old-2"]);
    mockedDeleteMany.mockResolvedValue({ deletedCount: 0 } as never);

    await SessionCapService.enforceOnSessionCreate("user-1");

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("swallows enforcement failures without throwing", async () => {
    mockedGetEntitlements.mockRejectedValue(new Error("redis down"));

    await expect(
      SessionCapService.enforceOnSessionCreate("user-1"),
    ).resolves.toBeUndefined();
    expect(mockedDeleteMany).not.toHaveBeenCalled();
  });
});
