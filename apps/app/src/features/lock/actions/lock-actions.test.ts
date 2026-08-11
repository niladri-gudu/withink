/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth";

import { LockRepository } from "../repositories/lock-repository";
import { LockService } from "../services/lock-service";
import {
  getLockSettingsAction,
  lockAction,
  saveLockSettingsAction,
  unlockAction,
  verifyPasswordAndResetLockAction,
} from "./lock-actions";

// Mock next/headers
vi.mock("next/headers", () => {
  const mCookies = {
    set: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  };
  return {
    headers: vi.fn().mockResolvedValue(new Map()),
    cookies: vi.fn().mockResolvedValue(mCookies),
  };
});

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      signInEmail: vi.fn(),
    },
  },
}));

// Mock Redis
vi.mock("@/lib/redis", () => {
  const chain = {
    incr: () => chain,
    expire: () => chain,
    ttl: () => chain,
    exec: async () => [1, 1, 60],
  };
  return {
    getCachedValue: vi.fn(),
    setCachedValue: vi.fn(),
    redis: {
      del: vi.fn(),
      pipeline: vi.fn(() => chain),
    },
  };
});

// Mock Resend
vi.mock("@/lib/email", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-id" }),
    },
  },
}));

// Mock LockRepository
vi.mock("../repositories/lock-repository", () => ({
  LockRepository: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    invalidateCache: vi.fn(),
  },
}));

describe("Lock Actions Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = "user-123";
  const mockSession = {
    user: {
      id: mockUserId,
      name: "Test Writer",
      email: "writer@withink.me",
    },
  };

  describe("getLockSettingsAction", () => {
    it("should return Unauthorized if session is missing", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const res = await getLockSettingsAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should return lock settings and unlock status on success", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        autoLockTimeout: 600,
        lockOnTabHide: false,
      } as any);

      // Mock cookie
      const cookieStore = await cookies();
      vi.mocked(cookieStore.get).mockReturnValue({
        value: "valid-cookie",
      } as any);

      // Mock LockService token decryption
      const spyIsUnlocked = vi
        .spyOn(LockService, "isSessionUnlocked")
        .mockResolvedValue(true);

      const res = await getLockSettingsAction();
      expect(spyIsUnlocked).toHaveBeenCalledWith(mockSession.user.id, true);
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        isLockEnabled: true,
        hasPasscode: true,
        autoLockTimeout: 600,
        lockOnTabHide: false,
        isUnlocked: true,
      });

      spyIsUnlocked.mockRestore();
    });
  });

  describe("unlockAction", () => {
    it("should return Unauthorized if session is missing", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const res = await unlockAction("1234");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should return error if passcode format is invalid", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      const res = await unlockAction("abc");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Passcode"); // Zod validation message
    });

    it("should return success directly if lock is disabled", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: false,
      } as any);

      const res = await unlockAction("1234");
      expect(res.success).toBe(true);
    });

    it("should set unlock cookie and return success on correct passcode", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        autoLockTimeout: 300,
      } as any);

      const spyVerify = vi
        .spyOn(LockService, "verifyPasscode")
        .mockReturnValue(true);
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await unlockAction("1234");
      expect(res.success).toBe(true);
      expect(spyVerify).toHaveBeenCalledWith("1234", "salt:hash");
      expect(spyCookie).toHaveBeenCalledWith(mockUserId, 300);

      spyVerify.mockRestore();
      spyCookie.mockRestore();
    });

    it("should return error on incorrect passcode", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
      } as any);

      const spyVerify = vi
        .spyOn(LockService, "verifyPasscode")
        .mockReturnValue(false);

      const res = await unlockAction("1234");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Incorrect passcode");

      spyVerify.mockRestore();
    });
  });

  describe("lockAction", () => {
    it("should clear the unlock cookie and return success", async () => {
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);
      const res = await lockAction();
      expect(res.success).toBe(true);
      expect(spyClear).toHaveBeenCalled();
      spyClear.mockRestore();
    });
  });

  describe("saveLockSettingsAction", () => {
    it("should save settings and set unlock cookie when enabling", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue(null);

      const spyHash = vi
        .spyOn(LockService, "hashPasscode")
        .mockReturnValue("salt:hash");
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: true,
        passcode: "1234",
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });

      expect(res.success).toBe(true);
      expect(LockRepository.saveSettings).toHaveBeenCalledWith(mockUserId, {
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });
      expect(spyCookie).toHaveBeenCalledWith(mockUserId, 300);

      spyHash.mockRestore();
      spyCookie.mockRestore();
    });

    it("should clear unlock cookie when disabling", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });

      expect(res.success).toBe(true);
      expect(LockRepository.saveSettings).toHaveBeenCalledWith(mockUserId, {
        isLockEnabled: false,
        passcodeHash: "",
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });
      expect(spyClear).toHaveBeenCalled();

      spyClear.mockRestore();
    });
  });

  describe("verifyPasswordAndResetLockAction", () => {
    it("should verify password and disable lock on success", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

      const spyVerifyPass = vi
        .spyOn(LockService, "verifyLoginPassword")
        .mockResolvedValue(true);
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await verifyPasswordAndResetLockAction("login-password-123");
      expect(res.success).toBe(true);
      expect(spyVerifyPass).toHaveBeenCalledWith(
        "writer@withink.me",
        "login-password-123",
      );
      expect(LockRepository.saveSettings).toHaveBeenCalledWith(mockUserId, {
        isLockEnabled: false,
        passcodeHash: "",
      });
      expect(spyClear).toHaveBeenCalled();

      spyVerifyPass.mockRestore();
      spyClear.mockRestore();
    });

    it("should fail and not disable lock on incorrect password", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

      const spyVerifyPass = vi
        .spyOn(LockService, "verifyLoginPassword")
        .mockResolvedValue(false);

      const res = await verifyPasswordAndResetLockAction("wrong-password");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Incorrect password");
      expect(LockRepository.saveSettings).not.toHaveBeenCalled();

      spyVerifyPass.mockRestore();
    });
  });
});
