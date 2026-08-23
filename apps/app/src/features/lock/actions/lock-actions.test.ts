/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestSession } from "@/lib/request-cache";

import { LockRepository } from "../repositories/lock-repository";
import { LockService } from "../services/lock-service";
import {
  getLockSettingsAction,
  lockAction,
  saveLockSettingsAction,
  unlockAction,
  unlockSessionAction,
  verifyPasswordAndResetLockAction,
} from "./lock-actions";

// Mock next/headers (cookies() is used by LockService + the test)
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

// Mock auth (kept so LockService's `auth` import resolves in tests)
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      signInEmail: vi.fn(),
    },
  },
}));

// Mock getRequestSession (never run the real cache()-wrapped implementation)
vi.mock("@/lib/request-cache", () => ({
  getRequestSession: vi.fn(),
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
      vi.mocked(getRequestSession).mockResolvedValue(null);
      const res = await getLockSettingsAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should return lock settings and unlock status on success", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
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
      vi.mocked(getRequestSession).mockResolvedValue(null);
      const res = await unlockAction("1234");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should return error if passcode format is invalid", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      const res = await unlockAction("abc");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Passcode"); // Zod validation message
    });

    it("should return success directly if lock is disabled", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: false,
      } as any);

      const res = await unlockAction("1234");
      expect(res.success).toBe(true);
    });

    it("should set unlock cookie and return success on correct passcode", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
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
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
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
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
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

    it("should clear unlock cookie when disabling (keep passcode hash for other devices)", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });

      expect(res.success).toBe(true);
      // Disabling is per-device: the account passcode hash is preserved so
      // other devices that still have the lock enabled keep working.
      expect(LockRepository.saveSettings).toHaveBeenCalledWith(mockUserId, {
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: true,
      });
      expect(spyClear).toHaveBeenCalled();

      spyClear.mockRestore();
    });
  });

  describe("unlockSessionAction", () => {
    const validProof = "a".repeat(64);

    it("should return Unauthorized if session is missing", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(null);
      const res = await unlockSessionAction(validProof);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should reject a malformed proof", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      const res = await unlockSessionAction("not-a-proof");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid unlock proof.");
    });

    it("should reject the proof when no hash is bound yet (no trust-on-first-use)", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        autoLockTimeout: 300,
        unlockProofHash: "",
      } as any);
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await unlockSessionAction(validProof);
      expect(res.success).toBe(false);
      expect(LockRepository.saveSettings).not.toHaveBeenCalled();
      expect(spyCookie).not.toHaveBeenCalled();

      spyCookie.mockRestore();
    });

    it("should set the unlock cookie when the proof matches the stored hash", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        autoLockTimeout: 600,
        unlockProofHash: LockService.hashUnlockProof(validProof),
      } as any);
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await unlockSessionAction(validProof);
      expect(res.success).toBe(true);
      expect(spyCookie).toHaveBeenCalledWith(mockUserId, 600);

      spyCookie.mockRestore();
    });

    it("should reject an incorrect proof without setting the cookie", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        autoLockTimeout: 300,
        unlockProofHash: LockService.hashUnlockProof("b".repeat(64)),
      } as any);
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await unlockSessionAction(validProof);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unlock verification failed.");
      expect(spyCookie).not.toHaveBeenCalled();

      spyCookie.mockRestore();
    });
  });

  describe("saveLockSettingsAction disable guard", () => {
    it("should refuse to disable the lock without proof of knowledge", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        unlockProofHash: "",
      } as any);

      const res = await saveLockSettingsAction({
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: false,
      });
      expect(res.success).toBe(false);
      expect(LockRepository.saveSettings).not.toHaveBeenCalled();
    });

    it("should allow disabling with a valid current passcode", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        unlockProofHash: "",
      } as any);
      const spyVerify = vi
        .spyOn(LockService, "verifyPasscode")
        .mockReturnValue(true);
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: false,
        currentPasscode: "1234",
      });
      expect(res.success).toBe(true);
      expect(spyVerify).toHaveBeenCalledWith("1234", "salt:hash");

      spyVerify.mockRestore();
      spyClear.mockRestore();
    });

    it("should allow disabling with a valid unlock proof", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      const storedProof = "c".repeat(64);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        unlockProofHash: LockService.hashUnlockProof(storedProof),
      } as any);
      const spyClear = vi
        .spyOn(LockService, "clearUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: false,
        autoLockTimeout: 300,
        lockOnTabHide: false,
        unlockProof: storedProof,
      });
      expect(res.success).toBe(true);

      spyClear.mockRestore();
    });

    it("should refuse to re-enable/rotate when a passcode exists and no proof is given", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue({
        isLockEnabled: false,
        passcodeHash: "salt:hash",
        unlockProofHash: "",
      } as any);
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      // Re-enabling without setting a new secret would mint an unlock cookie.
      const res = await saveLockSettingsAction({
        isLockEnabled: true,
        autoLockTimeout: 300,
        lockOnTabHide: false,
      });
      expect(res.success).toBe(false);
      expect(spyCookie).not.toHaveBeenCalled();

      // Rotating the passcode would let an attacker replace the secret.
      const rotate = await saveLockSettingsAction({
        isLockEnabled: true,
        passcode: "9999",
        autoLockTimeout: 300,
        lockOnTabHide: false,
      });
      expect(rotate.success).toBe(false);
      expect(LockRepository.saveSettings).not.toHaveBeenCalled();
      expect(spyCookie).not.toHaveBeenCalled();

      spyCookie.mockRestore();
    });

    it("should bind the unlock proof on first-time passcode setup when provided", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);
      vi.mocked(LockRepository.getSettings).mockResolvedValue(null);
      const proof = "d".repeat(64);
      const spyHash = vi
        .spyOn(LockService, "hashPasscode")
        .mockReturnValue("salt:hash");
      const spyCookie = vi
        .spyOn(LockService, "setUnlockCookie")
        .mockResolvedValue(undefined);

      const res = await saveLockSettingsAction({
        isLockEnabled: true,
        passcode: "1234",
        unlockProof: proof,
        autoLockTimeout: 300,
        lockOnTabHide: false,
      });
      expect(res.success).toBe(true);
      expect(LockRepository.saveSettings).toHaveBeenCalledWith(mockUserId, {
        isLockEnabled: true,
        passcodeHash: "salt:hash",
        unlockProofHash: LockService.hashUnlockProof(proof),
        autoLockTimeout: 300,
        lockOnTabHide: false,
      });

      spyHash.mockRestore();
      spyCookie.mockRestore();
    });
  });

  describe("verifyPasswordAndResetLockAction", () => {
    it("should verify password and disable lock on success", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);

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
        unlockProofHash: "",
      });
      expect(spyClear).toHaveBeenCalled();

      spyVerifyPass.mockRestore();
      spyClear.mockRestore();
    });

    it("should fail and not disable lock on incorrect password", async () => {
      vi.mocked(getRequestSession).mockResolvedValue(mockSession as any);

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
